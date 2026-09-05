import { Router } from 'express'
import { Nuvemshop, buildAuthorizeUrl, exchangeCodeForToken, normalizeProduct, normalizeOrder } from '@thymos/nuvemshop-sdk'
import type { AppConfig } from '../config.js'
import type { CredentialsStore } from '../store/credentialsStore.js'
import type { EventLogStore } from '../store/eventLogStore.js'
import { requireApiKey } from '../middlewares/requireApiKey.js'
import { createOAuthState, verifyOAuthState } from '../nuvemshopState.js'
import { logger } from '../logger.js'

export interface NuvemshopRouterDeps {
  config: AppConfig
  credentialsStore: CredentialsStore
  eventLog: EventLogStore
}

function unavailable(res: import('express').Response, reason: string) {
  res.status(503).json({ error: `Integração Nuvemshop indisponível: ${reason}` })
}

export function nuvemshopRouter({ config, credentialsStore, eventLog }: NuvemshopRouterDeps): Router {
  const router = Router()
  const adminAuth = requireApiKey(config.sessionSecret)

  async function getClient() {
    if (!config.nuvemshop) return null
    const creds = await credentialsStore.load()
    if (!creds) return null
    return new Nuvemshop({
      storeId: creds.storeId,
      accessToken: creds.accessToken,
      userAgent: config.nuvemshop.userAgent,
      onRequestLog: (entry) => {
        if (entry.status >= 400) {
          logger.warn('Chamada à API Nuvemshop retornou erro', { path: entry.path, status: entry.status, attempt: entry.attempt })
        }
      },
    })
  }

  // ── OAuth ────────────────────────────────────────────────────────────────

  router.get('/connect', (req, res) => {
    if (!config.nuvemshop) return unavailable(res, 'NUVEMSHOP_APP_ID/APP_SECRET/REDIRECT_URI não configurados')
    if (!config.sessionSecret) return unavailable(res, 'SESSION_SECRET não configurado (necessário para proteção CSRF do OAuth)')

    const state = createOAuthState(config.sessionSecret)
    const url = buildAuthorizeUrl(config.nuvemshop, state)
    res.redirect(302, url)
  })

  router.get('/callback', async (req, res) => {
    if (!config.nuvemshop) return unavailable(res, 'NUVEMSHOP_APP_ID/APP_SECRET/REDIRECT_URI não configurados')
    if (!config.sessionSecret) return unavailable(res, 'SESSION_SECRET não configurado')

    const code = req.query.code as string | undefined
    const state = req.query.state as string | undefined

    if (!verifyOAuthState(state, config.sessionSecret)) {
      await eventLog.record({ level: 'warn', category: 'oauth', message: 'Callback OAuth rejeitado: state inválido/expirado (possível CSRF)' })
      res.status(400).json({ error: 'Parâmetro state inválido ou expirado. Reinicie a conexão em /nuvemshop/connect.' })
      return
    }

    if (!code) {
      res.status(400).json({ error: 'Código de autorização ausente' })
      return
    }

    try {
      const token = await exchangeCodeForToken(config.nuvemshop, code)
      const storeId = String(token.user_id ?? token.store_id)
      await credentialsStore.save({
        storeId,
        accessToken: token.access_token,
        scope: token.scope,
        connectedAt: new Date().toISOString(),
      })
      await eventLog.record({ level: 'info', category: 'oauth', message: 'Loja conectada com sucesso', detail: { storeId } })

      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.status(200).send(
        `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Thymos — Conectado</title></head>` +
          `<body style="font-family:sans-serif;background:#324d3e;color:#f5f2ea;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">` +
          `<div style="text-align:center;padding:2rem"><h1>✓ Nuvemshop conectada</h1><p>Loja ID: ${storeId}</p></div></body></html>`
      )
    } catch (err) {
      logger.error('Falha ao trocar code por access_token', { message: (err as Error).message })
      await eventLog.record({ level: 'error', category: 'oauth', message: 'Falha ao trocar code por access_token', detail: { error: (err as Error).message } })
      res.status(400).json({ error: 'Falha ao concluir autenticação com a Nuvemshop', detail: (err as Error).message })
    }
  })

  router.get('/status', async (_req, res) => {
    if (!config.nuvemshop) {
      res.json({ connected: false, configured: false, reason: 'Credenciais do app Nuvemshop não configuradas' })
      return
    }
    // Tudo a partir daqui envolve I/O externo (credentialsStore pode ser o
    // Supabase, client.store.get() chama a API da Nuvemshop) — qualquer falha
    // aqui precisa degradar para connected:false, nunca derrubar o processo
    // (Express 4 não captura rejeições assíncronas automaticamente: um erro
    // não tratado numa rota async vira unhandledRejection e derruba a API).
    try {
      const client = await getClient()
      if (!client) {
        res.json({ connected: false, configured: true })
        return
      }
      const store = await client.store.get()
      res.json({ connected: true, configured: true, storeId: store.id, storeName: store.name?.pt || store.name?.en })
    } catch (err) {
      logger.error('Falha ao verificar status da conexão Nuvemshop', { message: (err as Error).message })
      res.json({ connected: false, configured: true, error: (err as Error).message })
    }
  })

  router.post('/disconnect', adminAuth, async (_req, res, next) => {
    try {
      await credentialsStore.clear()
      await eventLog.record({ level: 'info', category: 'oauth', message: 'Loja desconectada manualmente' })
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  })

  // ── Sincronização ──────────────────────────────────────────────────────

  router.post('/sync/products', adminAuth, async (_req, res, next) => {
    try {
      const client = await getClient()
      if (!client) return unavailable(res, 'Loja não conectada — acesse /nuvemshop/connect primeiro')

      const products = await client.products.listAll()
      const normalized = products.map((p) => {
        try {
          return { ok: true as const, product: normalizeProduct(p) }
        } catch (err) {
          return { ok: false as const, id: p.id, error: (err as Error).message }
        }
      })

      const synced = normalized.filter((n) => n.ok)
      const failed = normalized.filter((n) => !n.ok)

      await eventLog.record({
        level: failed.length > 0 ? 'warn' : 'info',
        category: 'sync',
        message: `Sincronização de produtos: ${synced.length} ok, ${failed.length} falharam`,
      })

      res.json({
        success: true,
        total: products.length,
        synced: synced.length,
        failed: failed.length,
        errors: failed.length > 0 ? failed : undefined,
        products: synced.map((n) => (n as { product: unknown }).product),
      })
    } catch (err) {
      next(err)
    }
  })

  router.get('/sync/orders', adminAuth, async (req, res, next) => {
    try {
      const client = await getClient()
      if (!client) return unavailable(res, 'Loja não conectada')
      const status = req.query.status as string | undefined
      const orders = await client.orders.listAll(status ? { status } : undefined)
      res.json({ total: orders.length, orders: orders.map(normalizeOrder) })
    } catch (err) {
      next(err)
    }
  })

  router.get('/sync/customers', adminAuth, async (_req, res, next) => {
    try {
      const client = await getClient()
      if (!client) return unavailable(res, 'Loja não conectada')
      const customers = await client.customers.listAll()
      res.json({ total: customers.length, customers })
    } catch (err) {
      next(err)
    }
  })

  router.post('/push/products', adminAuth, async (req, res, next) => {
    try {
      const client = await getClient()
      if (!client) return unavailable(res, 'Loja não conectada')

      const { action, product } = req.body ?? {}
      if (!action || !product) {
        res.status(400).json({ error: 'Campos "action" e "product" são obrigatórios' })
        return
      }

      if (action === 'delete') {
        if (!product.nuvemshopId) {
          res.status(400).json({ error: 'product.nuvemshopId é obrigatório para exclusão' })
          return
        }
        await client.products.delete(product.nuvemshopId)
        res.json({ success: true })
        return
      }

      const payload = {
        name: { pt: product.name },
        description: { pt: product.description || '' },
        variants: [
          {
            price: String(product.price ?? 0),
            stock: product.stock != null ? Number(product.stock) : null,
            sku: product.sku || undefined,
            promotional_price: product.promotionalPrice ? String(product.promotionalPrice) : undefined,
          },
        ],
      }

      if (action === 'create' || !product.nuvemshopId) {
        const created = await client.products.create(payload)
        if (product.images?.length) {
          for (const src of product.images as string[]) {
            await client.products.addImage(created.id, src)
          }
        }
        res.json({ success: true, nuvemshopId: created.id })
        return
      }

      if (action === 'update') {
        await client.products.update(product.nuvemshopId, payload)
        res.json({ success: true, nuvemshopId: product.nuvemshopId })
        return
      }

      res.status(400).json({ error: `action inválida: ${action}` })
    } catch (err) {
      next(err)
    }
  })

  router.get('/logs', adminAuth, async (req, res) => {
    const limit = Number(req.query.limit) || 50
    res.json({ events: await eventLog.recent(limit) })
  })

  return router
}

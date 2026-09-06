import { Router } from 'express'
import type { ProductsStore } from '../store/productsStore.js'
import type { OrdersStore, OrderItem } from '../store/ordersStore.js'
import type { EventLogStore } from '../store/eventLogStore.js'
import type { Mailer } from '../lib/mailer.js'
import { logger } from '../logger.js'

export interface ShopRouterDeps {
  productsStore: ProductsStore | null
  ordersStore: OrdersStore | null
  eventLog: EventLogStore
  mailer: Mailer
}

/**
 * Catálogo público de produtos e captura de pedidos, servindo o storefront
 * (apps/storefront) diretamente do Supabase — sem depender da Nuvemshop
 * estar conectada. Rotas públicas de propósito (sem chave de admin): o
 * catálogo é informação pública da vitrine, e o pedido é o próprio fluxo de
 * checkout do cliente final.
 *
 * CORS liberado para qualquer origem nestas duas rotas especificamente
 * (independente de CORS_ALLOWED_ORIGINS): o storefront estático é publicado
 * em domínios que mudam (GitHub Pages, CDN, domínio próprio futuro) e não
 * há dado sensível sendo exposto aqui (catálogo público + intake de pedido,
 * sem autenticação de admin envolvida de qualquer forma).
 */
export function shopRouter({ productsStore, ordersStore, eventLog, mailer }: ShopRouterDeps): Router {
  const router = Router()

  function allowAnyOrigin(res: import('express').Response) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }

  router.options('/products', (_req, res) => {
    allowAnyOrigin(res)
    res.status(204).end()
  })

  router.get('/products', async (_req, res) => {
    allowAnyOrigin(res)
    if (!productsStore) {
      res.status(503).json({ error: 'Catálogo indisponível — Supabase não configurado' })
      return
    }
    try {
      const products = await productsStore.listActive()
      res.json({ products })
    } catch (err) {
      logger.error('Falha ao listar produtos', { message: (err as Error).message })
      res.status(503).json({ error: 'Não foi possível carregar o catálogo agora. Tente novamente em instantes.' })
    }
  })

  router.options('/orders', (_req, res) => {
    allowAnyOrigin(res)
    res.status(204).end()
  })

  router.post('/orders', async (req, res) => {
    allowAnyOrigin(res)
    if (!ordersStore) {
      res.status(503).json({ error: 'Checkout indisponível — Supabase não configurado' })
      return
    }

    const { customerName, customerEmail, customerPhone, items, total } = req.body ?? {}

    if (!customerName || !customerEmail || !Array.isArray(items) || items.length === 0 || typeof total !== 'number') {
      res.status(400).json({
        error: 'Campos obrigatórios: customerName, customerEmail, items (lista não vazia), total (número).',
      })
      return
    }
    const validItems: OrderItem[] = items
    if (!validItems.every((i) => i && typeof i.productId === 'number' && typeof i.name === 'string' && typeof i.price === 'number' && typeof i.qty === 'number')) {
      res.status(400).json({ error: 'Cada item precisa de productId, name, price e qty.' })
      return
    }

    try {
      const { id } = await ordersStore.create({ customerName, customerEmail, customerPhone, items: validItems, total })
      await eventLog.record({
        level: 'info',
        category: 'order',
        message: `Novo pedido recebido pelo storefront: #${id}`,
        detail: { id, customerEmail, total },
      })
      await mailer.send(
        `Novo pedido — #${id}`,
        `Cliente: ${customerName} (${customerEmail}${customerPhone ? `, ${customerPhone}` : ''})\n` +
          `Total: R$ ${total.toLocaleString('pt-BR')}\n\n` +
          `Itens:\n${validItems.map((i) => `- ${i.qty}x ${i.name} — R$ ${i.price.toLocaleString('pt-BR')}`).join('\n')}`
      )
      res.status(201).json({ success: true, orderId: id })
    } catch (err) {
      logger.error('Falha ao registrar pedido', { message: (err as Error).message })
      await eventLog.record({ level: 'error', category: 'order', message: 'Falha ao registrar pedido', detail: { error: (err as Error).message } })
      res.status(503).json({ error: 'Não foi possível registrar o pedido agora. Tente novamente em instantes.' })
    }
  })

  return router
}

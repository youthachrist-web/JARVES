import { Router } from 'express'
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  webhookIdempotencyKey,
  WEBHOOK_SIGNATURE_HEADER,
  REQUIRED_LGPD_WEBHOOK_TOPICS,
  type IdempotencyStore,
  type NuvemshopWebhookPayload,
} from '@thymos/nuvemshop-sdk'
import type { AppConfig } from '../config.js'
import type { CredentialsStore } from '../store/credentialsStore.js'
import type { EventLogStore } from '../store/eventLogStore.js'
import { requireRawBody } from '../middlewares/rawBody.js'
import { logger } from '../logger.js'

export interface WebhooksRouterDeps {
  config: AppConfig
  credentialsStore: CredentialsStore
  eventLog: EventLogStore
  idempotencyStore: IdempotencyStore
}

/**
 * Processa o evento de forma assíncrona (não bloqueia a resposta HTTP, que
 * já foi enviada como 200 antes desta função rodar). Erros aqui são
 * logados, nunca lançados de volta para o Express — a Nuvemshop já recebeu
 * seu 2XX e não deve reenviar por causa de uma falha de processamento
 * interno; a falha fica visível no log de eventos do painel admin.
 */
async function processEvent(payload: NuvemshopWebhookPayload, deps: WebhooksRouterDeps): Promise<void> {
  const { eventLog, credentialsStore } = deps
  try {
    switch (payload.event) {
      case 'app/uninstalled': {
        await credentialsStore.clear()
        await eventLog.record({ level: 'warn', category: 'webhook', message: 'App desinstalado pelo lojista — credenciais removidas', detail: { storeId: payload.store_id } })
        break
      }
      case 'store/redact':
      case 'customers/redact':
      case 'customers/data_request': {
        // Webhooks obrigatórios de LGPD/data protection para homologação do
        // app. Nenhum dado pessoal é retido por esta API além do token de
        // acesso da loja — não há PII de clientes armazenada localmente
        // (o catálogo/pedidos são lidos sob demanda da própria Nuvemshop).
        // Ainda assim, registramos o pedido para auditoria e para que o
        // proprietário do app responda ao lojista dentro do prazo, caso
        // dados adicionais venham a ser persistidos no futuro.
        await eventLog.record({
          level: 'info',
          category: 'webhook',
          message: `Solicitação LGPD recebida: ${payload.event}`,
          detail: { storeId: payload.store_id },
        })
        break
      }
      case 'product/created':
      case 'product/updated':
      case 'product/deleted':
      case 'order/created':
      case 'order/updated':
      case 'order/paid':
      case 'order/cancelled':
      case 'customer/created':
      case 'customer/updated': {
        // MVP: apenas registra o evento para exibição em "Última sincronização"
        // no painel. Uma sincronização incremental automática (buscar só o
        // recurso `payload.id` e atualizar o cache local) é o próximo passo
        // natural quando o projeto tiver um banco de catálogo dedicado —
        // hoje o catálogo é lido sob demanda via /nuvemshop/sync/*.
        await eventLog.record({ level: 'info', category: 'webhook', message: `Evento recebido: ${payload.event}`, detail: { id: payload.id } })
        break
      }
      default: {
        await eventLog.record({ level: 'info', category: 'webhook', message: `Evento não tratado: ${payload.event}` })
      }
    }
  } catch (err) {
    logger.error('Falha ao processar evento de webhook', { event: payload.event, message: (err as Error).message })
    await eventLog.record({ level: 'error', category: 'webhook', message: `Falha ao processar ${payload.event}`, detail: { error: (err as Error).message } })
  }
}

export function webhooksRouter(deps: WebhooksRouterDeps): Router {
  const router = Router()
  const { config, eventLog, idempotencyStore } = deps

  // Endpoint único para todos os tópicos de webhook da Nuvemshop, incluindo
  // os 3 obrigatórios de LGPD (store/redact, customers/redact,
  // customers/data_request). Cadastrar esta mesma URL para todos os tópicos
  // no painel de parceiros Nuvemshop.
  router.post('/nuvemshop', requireRawBody, async (req, res) => {
    if (!config.nuvemshop) {
      res.status(503).json({ error: 'NUVEMSHOP_APP_SECRET não configurado — não é possível validar webhooks' })
      return
    }

    const signature = req.header(WEBHOOK_SIGNATURE_HEADER)
    const rawBody = req.rawBody!

    if (!verifyWebhookSignature(rawBody, signature, config.nuvemshop.appSecret)) {
      logger.warn('Webhook rejeitado: assinatura HMAC inválida ou ausente')
      await eventLog.record({ level: 'warn', category: 'webhook', message: 'Webhook rejeitado: assinatura inválida' })
      res.status(401).json({ error: 'Assinatura inválida' })
      return
    }

    let payload: NuvemshopWebhookPayload
    try {
      payload = parseWebhookPayload(rawBody)
    } catch (err) {
      res.status(400).json({ error: 'Payload malformado', detail: (err as Error).message })
      return
    }

    const key = webhookIdempotencyKey(payload)
    if (await idempotencyStore.hasSeen(key)) {
      // Reentrega do mesmo evento (a Nuvemshop reenvia até 16x/48h se não
      // receber 2XX a tempo) — responde 200 sem reprocessar.
      res.status(200).json({ received: true, deduped: true })
      return
    }
    await idempotencyStore.markSeen(key)

    // Responde rápido (a Nuvemshop espera 2XX em ~3s) e processa depois.
    res.status(200).json({ received: true })
    void processEvent(payload, deps)
  })

  router.get('/nuvemshop/required-topics', (_req, res) => {
    res.json({ required: REQUIRED_LGPD_WEBHOOK_TOPICS })
  })

  return router
}

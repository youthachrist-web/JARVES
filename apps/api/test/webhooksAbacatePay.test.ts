import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createHmac } from 'node:crypto'
import { InMemoryIdempotencyStore } from '@thymos/nuvemshop-sdk'
import { webhooksRouter } from '../src/routes/webhooks.js'
import type { AppConfig } from '../src/config.js'
import { InMemoryCredentialsStore } from '../src/store/credentialsStore.js'
import { InMemoryEventLogStore } from '../src/store/eventLogStore.js'
import type { Mailer } from '../src/lib/mailer.js'
import type { OrdersStore, PaidOrderInfo } from '../src/store/ordersStore.js'
import { captureRawBody } from '../src/middlewares/rawBody.js'

const WEBHOOK_SECRET = 'segredo-de-teste'

/** Assina um payload exatamente como a AbacatePay assina (ver routes/webhooks.ts#verifyAbacatePaySignature). */
function sign(body: unknown, secret: string = WEBHOOK_SECRET): string {
  return createHmac('sha256', secret).update(JSON.stringify(body)).digest('base64')
}

function baseConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: 0,
    corsAllowedOrigins: ['http://localhost:5173'],
    sessionSecret: 'session-secret',
    supabaseUrl: null,
    supabaseAnonKey: null,
    supabaseServiceRoleKey: null,
    smtp: null,
    adminAppUrl: null,
    nuvemshop: null,
    abacatePayApiKey: null,
    abacatePayWebhookSecret: WEBHOOK_SECRET,
    storefrontUrl: null,
    ...overrides,
  }
}

function fakeOrdersStore(paidOrder: PaidOrderInfo | null): OrdersStore & { markPaidByCheckoutId: ReturnType<typeof vi.fn> } {
  return {
    create: vi.fn(),
    attachPayment: vi.fn(),
    markPaidByCheckoutId: vi.fn().mockResolvedValue(paidOrder),
    getStatus: vi.fn(),
  }
}

function buildApp(config: AppConfig, ordersStore: OrdersStore | null, mailer?: Mailer) {
  const app = express()
  app.use(captureRawBody)
  const eventLog = new InMemoryEventLogStore()
  const sendMock = mailer ?? ({ send: vi.fn().mockResolvedValue(undefined) } as Mailer)
  app.use(
    '/webhooks',
    webhooksRouter({
      config,
      credentialsStore: new InMemoryCredentialsStore(),
      eventLog,
      idempotencyStore: new InMemoryIdempotencyStore(),
      mailer: sendMock,
      ordersStore,
    })
  )
  return { app, eventLog, mailer: sendMock }
}

const PAID_ORDER: PaidOrderInfo = { id: 42, customerEmail: 'ana@example.com', customerName: 'Ana Silva', total: 429 }

describe('POST /webhooks/abacatepay', () => {
  it('responde 503 quando o Supabase (ordersStore) não está configurado', async () => {
    const { app } = buildApp(baseConfig(), null)
    const body = { event: 'checkout.completed', data: { id: 'bill_123' } }
    const res = await request(app).post('/webhooks/abacatepay').set('X-Webhook-Signature', sign(body)).send(body)
    expect(res.status).toBe(503)
  })

  it('responde 503 quando ABACATEPAY_WEBHOOK_SECRET não está configurado', async () => {
    const { app } = buildApp(baseConfig({ abacatePayWebhookSecret: null }), fakeOrdersStore(PAID_ORDER))
    const body = { event: 'checkout.completed', data: { id: 'bill_123' } }
    const res = await request(app).post('/webhooks/abacatepay').set('X-Webhook-Signature', sign(body)).send(body)
    expect(res.status).toBe(503)
  })

  it('rejeita requisição com assinatura calculada com secret errado', async () => {
    const { app, eventLog } = buildApp(baseConfig(), fakeOrdersStore(PAID_ORDER))
    const body = { event: 'checkout.completed', data: { id: 'bill_123' } }
    const res = await request(app).post('/webhooks/abacatepay').set('X-Webhook-Signature', sign(body, 'secret-errado')).send(body)
    expect(res.status).toBe(401)
    const events = await eventLog.recent(10)
    expect(events.some((e) => e.message.includes('assinatura inválida'))).toBe(true)
  })

  it('rejeita requisição sem nenhuma assinatura', async () => {
    const { app } = buildApp(baseConfig(), fakeOrdersStore(PAID_ORDER))
    const res = await request(app).post('/webhooks/abacatepay').send({ event: 'checkout.completed', data: { id: 'bill_123' } })
    expect(res.status).toBe(401)
  })

  it('rejeita requisição com o corpo adulterado (assinatura não bate mais)', async () => {
    const { app } = buildApp(baseConfig(), fakeOrdersStore(PAID_ORDER))
    const signedBody = { event: 'checkout.completed', data: { id: 'bill_123' } }
    const signature = sign(signedBody)
    const res = await request(app)
      .post('/webhooks/abacatepay')
      .set('X-Webhook-Signature', signature)
      .send({ event: 'checkout.completed', data: { id: 'bill_outro' } })
    expect(res.status).toBe(401)
  })

  it('reconhece mas não processa eventos que não sejam de pagamento confirmado', async () => {
    const orders = fakeOrdersStore(PAID_ORDER)
    const { app } = buildApp(baseConfig(), orders)
    const body = { event: 'checkout.refunded', data: { id: 'bill_123' } }
    const res = await request(app).post('/webhooks/abacatepay').set('X-Webhook-Signature', sign(body)).send(body)
    expect(res.status).toBe(200)
    expect(orders.markPaidByCheckoutId).not.toHaveBeenCalled()
  })

  it('rejeita payload de evento de pagamento sem data.id', async () => {
    const { app } = buildApp(baseConfig(), fakeOrdersStore(PAID_ORDER))
    const body = { event: 'checkout.completed', data: {} }
    const res = await request(app).post('/webhooks/abacatepay').set('X-Webhook-Signature', sign(body)).send(body)
    expect(res.status).toBe(400)
  })

  it('marca o pedido como pago e notifica por e-mail quando checkout.completed chega com assinatura válida', async () => {
    const orders = fakeOrdersStore(PAID_ORDER)
    const mailer = { send: vi.fn().mockResolvedValue(undefined) }
    const { app, eventLog } = buildApp(baseConfig(), orders, mailer)

    const body = { event: 'checkout.completed', data: { id: 'bill_fake123', externalId: 'pedido-42', status: 'PAID' } }
    const res = await request(app).post('/webhooks/abacatepay').set('X-Webhook-Signature', sign(body)).send(body)

    expect(res.status).toBe(200)
    // Processamento é assíncrono (responde 200 antes) — espera a próxima volta do loop.
    await new Promise((r) => setTimeout(r, 10))

    expect(orders.markPaidByCheckoutId).toHaveBeenCalledWith('bill_fake123')
    expect(mailer.send).toHaveBeenCalledTimes(1)
    expect(mailer.send.mock.calls[0][0]).toMatch(/42/)

    const events = await eventLog.recent(10)
    expect(events.some((e) => e.message.includes('Pedido pago — #42'))).toBe(true)
  })

  it('não quebra quando o checkoutId não corresponde a nenhum pedido conhecido (reentrega/pedido removido)', async () => {
    const orders = fakeOrdersStore(null)
    const { app } = buildApp(baseConfig(), orders)

    const body = { event: 'checkout.completed', data: { id: 'bill_desconhecido' } }
    const res = await request(app).post('/webhooks/abacatepay').set('X-Webhook-Signature', sign(body)).send(body)

    expect(res.status).toBe(200)
    await new Promise((r) => setTimeout(r, 10))
    expect(orders.markPaidByCheckoutId).toHaveBeenCalledWith('bill_desconhecido')
  })
})

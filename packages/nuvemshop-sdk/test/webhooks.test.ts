import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import {
  verifyWebhookSignature,
  computeWebhookSignature,
  parseWebhookPayload,
  webhookIdempotencyKey,
  InMemoryIdempotencyStore,
} from '../src/webhooks.js'

const SECRET = 'test-app-secret'

describe('webhook signature verification', () => {
  it('aceita uma assinatura válida', () => {
    const body = JSON.stringify({ store_id: 123, event: 'product/created', id: 999 })
    const signature = computeWebhookSignature(body, SECRET)
    expect(verifyWebhookSignature(body, signature, SECRET)).toBe(true)
  })

  it('rejeita uma assinatura inválida (payload adulterado)', () => {
    const body = JSON.stringify({ store_id: 123, event: 'product/created', id: 999 })
    const signature = computeWebhookSignature(body, SECRET)
    const tamperedBody = JSON.stringify({ store_id: 123, event: 'product/deleted', id: 999 })
    expect(verifyWebhookSignature(tamperedBody, signature, SECRET)).toBe(false)
  })

  it('rejeita quando o header de assinatura está ausente', () => {
    const body = JSON.stringify({ store_id: 123, event: 'product/created' })
    expect(verifyWebhookSignature(body, undefined, SECRET)).toBe(false)
    expect(verifyWebhookSignature(body, null, SECRET)).toBe(false)
  })

  it('rejeita assinatura calculada com secret errado', () => {
    const body = JSON.stringify({ store_id: 123, event: 'product/created' })
    const wrongSignature = createHmac('sha256', 'outro-secret').update(body).digest('hex')
    expect(verifyWebhookSignature(body, wrongSignature, SECRET)).toBe(false)
  })

  it('não lança exceção para assinatura de tamanho/formato inválido', () => {
    const body = JSON.stringify({ store_id: 123, event: 'product/created' })
    expect(() => verifyWebhookSignature(body, 'nao-e-hex-valido!!', SECRET)).not.toThrow()
    expect(verifyWebhookSignature(body, 'nao-e-hex-valido!!', SECRET)).toBe(false)
  })
})

describe('parseWebhookPayload', () => {
  it('faz parse de um payload válido', () => {
    const payload = parseWebhookPayload(JSON.stringify({ store_id: 1, event: 'order/paid', id: 42 }))
    expect(payload.event).toBe('order/paid')
    expect(payload.store_id).toBe(1)
  })

  it('lança erro para JSON inválido (dados corrompidos)', () => {
    expect(() => parseWebhookPayload('{ isso nao e json')).toThrow()
  })

  it('lança erro quando faltam campos obrigatórios', () => {
    expect(() => parseWebhookPayload(JSON.stringify({ foo: 'bar' }))).toThrow(/inválido/)
  })
})

describe('idempotência de eventos duplicados', () => {
  it('gera a mesma chave para o mesmo evento', () => {
    const payload = { store_id: 1, event: 'order/paid' as const, id: 42 }
    expect(webhookIdempotencyKey(payload)).toBe(webhookIdempotencyKey(payload))
  })

  it('gera chaves diferentes para eventos diferentes', () => {
    const a = webhookIdempotencyKey({ store_id: 1, event: 'order/paid', id: 42 })
    const b = webhookIdempotencyKey({ store_id: 1, event: 'order/cancelled', id: 42 })
    expect(a).not.toBe(b)
  })

  it('InMemoryIdempotencyStore detecta reentrega do mesmo evento (retry da Nuvemshop)', () => {
    const store = new InMemoryIdempotencyStore()
    const key = webhookIdempotencyKey({ store_id: 1, event: 'product/updated', id: 7 })

    expect(store.hasSeen(key)).toBe(false)
    store.markSeen(key)
    expect(store.hasSeen(key)).toBe(true)

    // Segunda entrega do mesmo evento (a Nuvemshop reenvia até 16x em 48h se não obtiver 2XX a tempo)
    expect(store.hasSeen(key)).toBe(true)
  })

  it('descarta entradas antigas ao atingir o tamanho máximo (evita vazamento de memória)', () => {
    const store = new InMemoryIdempotencyStore(2)
    store.markSeen('a')
    store.markSeen('b')
    store.markSeen('c') // deve expulsar 'a'
    expect(store.hasSeen('a')).toBe(false)
    expect(store.hasSeen('b')).toBe(true)
    expect(store.hasSeen('c')).toBe(true)
  })
})

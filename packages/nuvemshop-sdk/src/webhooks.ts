import { createHmac, timingSafeEqual } from 'node:crypto'
import type { NuvemshopWebhookPayload } from './types.js'

/** Nome do header de assinatura enviado pela Nuvemshop em todo webhook. */
export const WEBHOOK_SIGNATURE_HEADER = 'x-linkedstore-hmac-sha256'

/**
 * Calcula a assinatura HMAC-SHA256 esperada para um corpo de requisição.
 * IMPORTANTE: deve ser calculada sobre o corpo **bruto** (raw bytes/string),
 * antes de qualquer `JSON.parse` — por isso o servidor HTTP deve capturar o
 * raw body (ver apps/api/src/middlewares/rawBody.ts).
 */
export function computeWebhookSignature(rawBody: string | Buffer, appSecret: string): string {
  return createHmac('sha256', appSecret).update(rawBody).digest('hex')
}

/**
 * Valida a assinatura do webhook em tempo constante (evita timing attacks).
 * Retorna `false` para qualquer entrada malformada em vez de lançar exceção,
 * para que o handler HTTP sempre possa responder 401 de forma uniforme.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined | null,
  appSecret: string
): boolean {
  if (!signatureHeader) return false
  const expected = computeWebhookSignature(rawBody, appSecret)

  const expectedBuf = Buffer.from(expected, 'hex')
  const receivedBuf = Buffer.from(signatureHeader, 'hex')
  if (expectedBuf.length !== receivedBuf.length) return false

  try {
    return timingSafeEqual(expectedBuf, receivedBuf)
  } catch {
    return false
  }
}

export function parseWebhookPayload(rawBody: string | Buffer): NuvemshopWebhookPayload {
  const parsed = JSON.parse(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'))
  if (!parsed || typeof parsed !== 'object' || !('event' in parsed) || !('store_id' in parsed)) {
    throw new Error('Payload de webhook inválido: faltam campos "event"/"store_id"')
  }
  return parsed as NuvemshopWebhookPayload
}

/**
 * Chave de deduplicação estável para um evento de webhook. A Nuvemshop pode
 * reenviar o mesmo evento até 16 vezes em 48h caso não receba um 2XX a
 * tempo — o processamento deve ser idempotente usando esta chave.
 */
export function webhookIdempotencyKey(payload: NuvemshopWebhookPayload): string {
  const resourceId = payload.id ?? 'na'
  return `${payload.store_id}:${payload.event}:${resourceId}`
}

/** Interface mínima para um armazenamento de idempotência plugável (memória, Redis, Postgres...). */
export interface IdempotencyStore {
  /** Retorna true se a chave já foi vista (e portanto o evento deve ser ignorado). */
  hasSeen(key: string): Promise<boolean> | boolean
  markSeen(key: string): Promise<void> | void
}

/** Implementação simples em memória — adequada para um único processo/dev; em produção com múltiplas instâncias, usar Redis/Postgres. */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private seen = new Set<string>()
  private readonly maxSize: number

  constructor(maxSize = 10_000) {
    this.maxSize = maxSize
  }

  hasSeen(key: string): boolean {
    return this.seen.has(key)
  }

  markSeen(key: string): void {
    if (this.seen.size >= this.maxSize) {
      const first = this.seen.values().next().value
      if (first !== undefined) this.seen.delete(first)
    }
    this.seen.add(key)
  }
}

/** Tópicos de webhook cuja ausência bloqueia a homologação do app na Nuvemshop (LGPD/data protection). */
export const REQUIRED_LGPD_WEBHOOK_TOPICS = ['store/redact', 'customers/redact', 'customers/data_request'] as const

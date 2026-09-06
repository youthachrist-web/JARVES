import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Proteção CSRF do fluxo OAuth sem precisar de sessão/cookie server-side:
 * o `state` é um token assinado (timestamp + HMAC) verificado no callback.
 * Evita que um atacante induza a vítima a autorizar/desautorizar a loja
 * através de um link forjado.
 */
export function createOAuthState(sessionSecret: string): string {
  const timestamp = Date.now().toString()
  const signature = createHmac('sha256', sessionSecret).update(timestamp).digest('hex')
  return `${timestamp}.${signature}`
}

export function verifyOAuthState(state: string | undefined, sessionSecret: string, maxAgeMs = 15 * 60 * 1000): boolean {
  if (!state) return false
  const [timestamp, signature] = state.split('.')
  if (!timestamp || !signature) return false

  const age = Date.now() - Number(timestamp)
  if (!Number.isFinite(age) || age < 0 || age > maxAgeMs) return false

  const expected = createHmac('sha256', sessionSecret).update(timestamp).digest('hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  const receivedBuf = Buffer.from(signature, 'hex')
  if (expectedBuf.length !== receivedBuf.length) return false

  try {
    return timingSafeEqual(expectedBuf, receivedBuf)
  } catch {
    return false
  }
}

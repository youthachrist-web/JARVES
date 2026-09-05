/**
 * Logger estruturado mínimo, sem dependências externas.
 *
 * Regra de segurança: NUNCA logar tokens de acesso, secrets ou payloads
 * completos de webhook que possam conter dados pessoais. `redact` mascara
 * chaves sensíveis conhecidas antes de serializar.
 */

const SENSITIVE_KEYS = new Set([
  'access_token',
  'accesstoken',
  'client_secret',
  'app_secret',
  'appsecret',
  'authorization',
  'authentication',
  'password',
  'supabase_service_role_key',
  'session_secret',
])

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : redact(v)
    }
    return out
  }
  return value
}

type Level = 'debug' | 'info' | 'warn' | 'error'

function log(level: Level, message: string, meta?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: redact(meta) } : {}),
  }
  const line = JSON.stringify(entry)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
}

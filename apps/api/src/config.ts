import { loadNuvemshopEnv, type NuvemshopEnvConfig } from '@thymos/nuvemshop-sdk'
import { logger } from './logger.js'

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  /** Endereço que recebe as notificações (ex.: pedido pago, app desinstalado). */
  notifyTo: string
}

export interface AppConfig {
  port: number
  corsAllowedOrigins: string[]
  sessionSecret: string | null
  supabaseUrl: string | null
  supabaseAnonKey: string | null
  supabaseServiceRoleKey: string | null
  nuvemshop: NuvemshopEnvConfig | null
  smtp: SmtpConfig | null
}

/**
 * Carrega e valida a configuração da aplicação. Segue a regra de autonomia:
 * nunca interrompe o boot inteiro por falta de UMA credencial — cada
 * integração que depende de uma credencial ausente fica marcada como
 * indisponível (ver `nuvemshop === null`) e os endpoints correspondentes
 * respondem 503 com uma mensagem clara em vez de quebrar o processo.
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const nuvemshop = loadNuvemshopEnv(env, { allowMissing: true })

  const supabaseUrl = env.SUPABASE_URL || null
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || null
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || null

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logger.warn(
      'Supabase não configurado (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes) — usando armazenamento em memória para credenciais Nuvemshop. Isso é adequado apenas para desenvolvimento local.'
    )
  }

  let smtp: SmtpConfig | null = null
  if (env.SMTP_USER && env.SMTP_PASS) {
    smtp = {
      host: env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(env.SMTP_PORT || 465),
      secure: (env.SMTP_SECURE ?? 'true') !== 'false',
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      notifyTo: env.SMTP_NOTIFY_TO || env.SMTP_USER,
    }
  } else {
    logger.warn(
      'SMTP não configurado (SMTP_USER/SMTP_PASS ausentes) — notificações por e-mail (pedido pago, app desinstalado) ficam desativadas até serem configuradas.'
    )
  }

  return {
    port: Number(env.PORT || 3000),
    corsAllowedOrigins: (env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    sessionSecret: env.SESSION_SECRET || null,
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    nuvemshop,
    smtp,
  }
}

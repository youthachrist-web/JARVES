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
  /** URL pública de `apps/admin` (o painel administrativo React). Usada para
   * encaminhar o "app incorporado" da Nuvemshop para o painel de verdade em
   * vez de uma página estática — ver routes/nuvemshop.ts. */
  adminAppUrl: string | null
  /** Chave secreta da AbacatePay (ver lib/abacatepay.ts) — gera o link de
   * pagamento real do checkout. Sem ela, o pedido ainda é capturado
   * normalmente, só sem link de pagamento automático. */
  abacatePayApiKey: string | null
  /** Segredo usado para validar `?webhookSecret=` nas notificações de
   * pagamento confirmado (ver routes/webhooks.ts) — precisa ser o mesmo
   * valor configurado no cadastro do webhook no painel da AbacatePay. */
  abacatePayWebhookSecret: string | null
  /** URL pública do storefront (apps/storefront) — para onde a AbacatePay
   * redireciona o cliente ao voltar ou concluir o pagamento. */
  storefrontUrl: string | null
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

  const corsAllowedOrigins = (env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // Sem ADMIN_APP_URL explícita, assume a primeira origem de CORS — em todo
  // deploy deste projeto até agora, essa origem É o painel admin. Mantém o
  // app incorporado funcionando "de fábrica" sem exigir uma variável nova,
  // mas pode ser sobrescrita se algum dia isso deixar de ser verdade.
  //
  // Nunca usa um valor de localhost aqui: se CORS_ALLOWED_ORIGINS ainda
  // estiver no padrão de desenvolvimento (por falta de configuração em
  // produção), redirecionar o iframe da Nuvemshop para localhost quebraria
  // a tela por completo no navegador do lojista — melhor cair no fallback
  // estático (ver routes/nuvemshop.ts) do que mandar para um endereço que
  // não existe fora da máquina de quem está desenvolvendo.
  const candidateAdminAppUrl = env.ADMIN_APP_URL || corsAllowedOrigins[0] || null
  const adminAppUrl =
    candidateAdminAppUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(candidateAdminAppUrl) ? candidateAdminAppUrl : null

  if (!adminAppUrl) {
    logger.warn(
      'ADMIN_APP_URL não configurada (e CORS_ALLOWED_ORIGINS não aponta para uma origem pública) — o app incorporado na Nuvemshop vai usar uma página estática simples em vez do painel administrativo completo.'
    )
  }

  const abacatePayApiKey = env.ABACATEPAY_API_KEY || null
  if (!abacatePayApiKey) {
    logger.warn('ABACATEPAY_API_KEY não configurada — checkout vai capturar o pedido mas sem link de pagamento automático.')
  }

  return {
    port: Number(env.PORT || 3000),
    corsAllowedOrigins,
    sessionSecret: env.SESSION_SECRET || null,
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
    nuvemshop,
    smtp,
    adminAppUrl,
    abacatePayApiKey,
    abacatePayWebhookSecret: env.ABACATEPAY_WEBHOOK_SECRET || null,
    storefrontUrl: env.STOREFRONT_URL || null,
  }
}

import { loadNuvemshopEnv, type NuvemshopEnvConfig } from '@thymos/nuvemshop-sdk'
import { MELHOR_ENVIO_PROD_URL, MELHOR_ENVIO_SANDBOX_URL } from './lib/melhorEnvio.js'
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
  /** ABACATEPAY_CARD_ENABLED=true — desligado por padrão até a AbacatePay
   * homologar cartão para a conta (ver loadConfig). Controla só se a rota
   * pública GET /payment-methods anuncia `card: true` pro storefront; não
   * afeta o Pix, que independe deste flag. */
  abacatePayCardEnabled: boolean
  /** Segredo usado para validar `?webhookSecret=` nas notificações de
   * pagamento confirmado (ver routes/webhooks.ts) — precisa ser o mesmo
   * valor configurado no cadastro do webhook no painel da AbacatePay. */
  abacatePayWebhookSecret: string | null
  /** URL pública do storefront (apps/storefront) — para onde a AbacatePay
   * redireciona o cliente ao voltar ou concluir o pagamento. */
  storefrontUrl: string | null
  /** Token de aplicação da Melhor Envio (gerado no painel, sem OAuth
   * completo — ver docs.melhorenvio.com.br/docs/autenticacao-1). Sem ele,
   * GET/POST /shipping/quote e o frete no checkout ficam indisponíveis. */
  melhorEnvioToken: string | null
  /** https://melhorenvio.com.br (produção) ou https://sandbox.melhorenvio.com.br
   * (testes, sem gerar cobrança real de frete) — MELHOR_ENVIO_SANDBOX=true. */
  melhorEnvioBaseUrl: string
  /** Header User-Agent exigido pela Melhor Envio em todo request — formato
   * "Nome da Aplicação (email de contato)". */
  melhorEnvioUserAgent: string
  /** CEP de origem dos envios (endereço da loja) — obrigatório pra cotar
   * frete; sem ele, /shipping/quote responde 503 mesmo com token válido. */
  storeOriginCep: string | null
  /** Dimensões/peso padrão usados pra cotar frete, já que o catálogo ainda
   * não guarda peso/dimensões por produto — uma peça de roupa dobrada cabe
   * numa faixa parecida, então usamos um pacote único por item do pedido em
   * vez de modelar cada SKU individualmente. Sobrescrevível via env se a
   * embalagem real da loja for diferente. */
  melhorEnvioDefaultPackage: { widthCm: number; heightCm: number; lengthCm: number; weightKg: number }
  /** Mesmo valor de FREE_SHIPPING em apps/storefront/script.js — o
   * storefront só usa isso pra decidir o que MOSTRAR ("Frete grátis" na
   * barra de progresso); o servidor é quem decide de verdade se cobra frete
   * ou não (ver routes/shop.ts#POST /orders). */
  freeShippingThreshold: number
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

  // Desligado por padrão: a conta AbacatePay ainda não tem cartão homologado
  // (visto em produção — "CARD is not available for this store" tanto no
  // checkout transparente quanto no link hospedado). Vira true assim que a
  // AbacatePay confirmar a homologação, sem precisar de nenhuma mudança de
  // código — só a variável de ambiente (ver routes/shop.ts#GET
  // /payment-methods, que o storefront consulta pra habilitar a aba Cartão).
  const abacatePayCardEnabled = env.ABACATEPAY_CARD_ENABLED === 'true'

  const melhorEnvioToken = env.MELHOR_ENVIO_TOKEN || null
  if (!melhorEnvioToken) {
    logger.warn('MELHOR_ENVIO_TOKEN não configurada — cotação de frete e frete no checkout ficam indisponíveis.')
  }
  const storeOriginCep = env.STORE_ORIGIN_CEP || null
  if (melhorEnvioToken && !storeOriginCep) {
    logger.warn('STORE_ORIGIN_CEP não configurado — cotação de frete indisponível mesmo com MELHOR_ENVIO_TOKEN presente.')
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
    abacatePayCardEnabled,
    abacatePayWebhookSecret: env.ABACATEPAY_WEBHOOK_SECRET || null,
    storefrontUrl: env.STOREFRONT_URL || null,
    melhorEnvioToken,
    // MELHOR_ENVIO_BASE_URL tem prioridade — útil pra apontar pra um mock
    // local em testes/desenvolvimento sem precisar de token real.
    melhorEnvioBaseUrl: env.MELHOR_ENVIO_BASE_URL || (env.MELHOR_ENVIO_SANDBOX === 'true' ? MELHOR_ENVIO_SANDBOX_URL : MELHOR_ENVIO_PROD_URL),
    melhorEnvioUserAgent: env.MELHOR_ENVIO_USER_AGENT || 'Thymos (contato@thymosfit.com.br)',
    storeOriginCep,
    melhorEnvioDefaultPackage: {
      widthCm: Number(env.MELHOR_ENVIO_DEFAULT_WIDTH_CM || 25),
      heightCm: Number(env.MELHOR_ENVIO_DEFAULT_HEIGHT_CM || 5),
      lengthCm: Number(env.MELHOR_ENVIO_DEFAULT_LENGTH_CM || 20),
      weightKg: Number(env.MELHOR_ENVIO_DEFAULT_WEIGHT_KG || 0.3),
    },
    freeShippingThreshold: Number(env.FREE_SHIPPING_THRESHOLD || 299),
  }
}

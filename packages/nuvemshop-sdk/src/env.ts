/**
 * Validação explícita de variáveis de ambiente obrigatórias.
 *
 * Regra de segurança do projeto: nunca falhar silenciosamente / nunca rodar
 * em produção com segredos ausentes. Em desenvolvimento, o chamador pode
 * optar por `allowMissing: true` para continuar com um cliente "mock" e
 * deixar a etapa dependente da credencial claramente marcada nos logs.
 */

export interface NuvemshopEnvConfig {
  appId: string
  appSecret: string
  redirectUri: string
  userAgent: string
  scopes: string[]
}

export class MissingEnvError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`)
    this.name = 'MissingEnvError'
  }
}

export function loadNuvemshopEnv(
  env: Record<string, string | undefined> = process.env,
  opts: { allowMissing?: boolean } = {}
): NuvemshopEnvConfig | null {
  const required = {
    NUVEMSHOP_APP_ID: env.NUVEMSHOP_APP_ID,
    NUVEMSHOP_APP_SECRET: env.NUVEMSHOP_APP_SECRET,
    NUVEMSHOP_REDIRECT_URI: env.NUVEMSHOP_REDIRECT_URI,
  }

  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k)

  if (missing.length > 0) {
    if (opts.allowMissing) {
      console.warn(
        `[nuvemshop-sdk] AVISO: rodando sem ${missing.join(', ')}. ` +
          'Funcionalidades que dependem da Nuvemshop ficarão indisponíveis até a configuração ser concluída pelo proprietário do app.'
      )
      return null
    }
    throw new MissingEnvError(missing)
  }

  return {
    appId: required.NUVEMSHOP_APP_ID!,
    appSecret: required.NUVEMSHOP_APP_SECRET!,
    redirectUri: required.NUVEMSHOP_REDIRECT_URI!,
    userAgent: env.NUVEMSHOP_USER_AGENT || 'Thymos App (contato@thymos.com.br)',
    scopes: (env.NUVEMSHOP_SCOPES || 'read_products,write_products,read_orders,write_orders,read_customers,write_customers')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  }
}

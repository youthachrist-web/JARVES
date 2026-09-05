import type { NuvemshopEnvConfig } from './env.js'
import type { NuvemshopTokenResponse } from './types.js'

export const AUTHORIZE_BASE_URL = 'https://www.tiendanube.com/apps'
export const TOKEN_URL = 'https://www.tiendanube.com/apps/authorize/token'

/**
 * Monta a URL de autorização OAuth (o lojista é redirecionado para cá a
 * partir do painel admin da Nuvemshop ou de um link "Instalar app").
 *
 * `state` é fortemente recomendado como proteção CSRF: gere um valor
 * aleatório, guarde-o na sessão do usuário e valide no callback.
 */
export function buildAuthorizeUrl(config: Pick<NuvemshopEnvConfig, 'appId'>, state?: string): string {
  const url = new URL(`${AUTHORIZE_BASE_URL}/${config.appId}/authorize`)
  if (state) url.searchParams.set('state', state)
  return url.toString()
}

export interface ExchangeCodeOptions {
  fetchImpl?: typeof fetch
}

/**
 * Troca o `code` de autorização pelo access_token definitivo (a Nuvemshop
 * emite tokens sem expiração — não há refresh token a gerenciar, mas o token
 * deve ser revogado/descartado ao receber o webhook `app/uninstalled`).
 */
export async function exchangeCodeForToken(
  config: Pick<NuvemshopEnvConfig, 'appId' | 'appSecret'>,
  code: string,
  opts: ExchangeCodeOptions = {}
): Promise<NuvemshopTokenResponse> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.appId,
      client_secret: config.appSecret,
      grant_type: 'authorization_code',
      code,
    }),
  })

  const body = await res.json().catch(() => null)

  if (!res.ok || !body?.access_token) {
    const err = new Error(`Falha ao trocar code por access_token (status ${res.status})`) as Error & {
      status: number
      body: unknown
    }
    err.status = res.status
    err.body = body
    throw err
  }

  const storeId = body.user_id ?? body.store_id
  if (!storeId) {
    throw new Error('Resposta de token da Nuvemshop sem user_id/store_id')
  }

  return body as NuvemshopTokenResponse
}

import { describe, it, expect, vi } from 'vitest'
import { buildAuthorizeUrl, exchangeCodeForToken } from '../src/oauth.js'

describe('buildAuthorizeUrl', () => {
  it('monta a URL de autorização com o app id e state', () => {
    const url = buildAuthorizeUrl({ appId: '32653' }, 'csrf-token-123')
    expect(url).toBe('https://www.tiendanube.com/apps/32653/authorize?state=csrf-token-123')
  })

  it('omite o parâmetro state quando não fornecido', () => {
    const url = buildAuthorizeUrl({ appId: '32653' })
    expect(url).toBe('https://www.tiendanube.com/apps/32653/authorize')
  })
})

describe('exchangeCodeForToken — sucesso', () => {
  it('retorna o token quando a API responde com access_token e user_id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'tok_123', token_type: 'bearer', scope: 'read_products', user_id: 999 }), {
        status: 200,
      })
    )

    const result = await exchangeCodeForToken({ appId: '32653', appSecret: 'segredo' }, 'auth-code', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(result.access_token).toBe('tok_123')
    expect(result.user_id).toBe(999)
    const [, init] = fetchImpl.mock.calls[0]
    const sentBody = JSON.parse(init.body)
    expect(sentBody).toMatchObject({ client_id: '32653', client_secret: 'segredo', grant_type: 'authorization_code', code: 'auth-code' })
  })
})

describe('exchangeCodeForToken — code inválido/expirado', () => {
  it('lança erro quando a API retorna 400', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })
    )

    await expect(
      exchangeCodeForToken({ appId: '32653', appSecret: 'segredo' }, 'code-expirado', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toMatchObject({ status: 400 })
  })
})

describe('exchangeCodeForToken — resposta sem store id', () => {
  it('lança erro explícito quando a resposta não contém user_id nem store_id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'tok_123', token_type: 'bearer' }), { status: 200 })
    )

    await expect(
      exchangeCodeForToken({ appId: '32653', appSecret: 'segredo' }, 'code', {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).rejects.toThrow(/user_id\/store_id/)
  })
})

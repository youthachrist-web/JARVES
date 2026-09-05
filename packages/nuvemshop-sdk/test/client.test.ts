import { describe, it, expect, vi } from 'vitest'
import { NuvemshopClient } from '../src/client.js'
import type { NuvemshopApiError } from '../src/types.js'

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
}

describe('NuvemshopClient — cenário de sucesso', () => {
  it('faz a requisição com os headers obrigatórios e retorna o corpo', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([{ id: 1 }]))
    const client = new NuvemshopClient({
      storeId: '999',
      accessToken: 'tok_abc',
      userAgent: 'Thymos Test (test@thymos.com.br)',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    const result = await client.get('/products')

    expect(result).toEqual([{ id: 1 }])
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.tiendanube.com/v1/999/products')
    expect(init.headers.Authentication).toBe('bearer tok_abc')
    expect(init.headers['User-Agent']).toBe('Thymos Test (test@thymos.com.br)')
  })
})

describe('NuvemshopClient — erro da API (token inválido / 401)', () => {
  it('lança erro não-retryable e não tenta novamente', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ message: 'Invalid access token' }, { status: 401 }))
    const client = new NuvemshopClient({
      storeId: '1',
      accessToken: 'invalido',
      userAgent: 'Thymos Test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: vi.fn().mockResolvedValue(undefined),
    })

    await expect(client.get('/products')).rejects.toMatchObject({ status: 401 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

describe('NuvemshopClient — rate limit (429) com retry', () => {
  it('respeita x-rate-limit-reset e tenta novamente até dar certo', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined)
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ message: 'Too Many Requests' }, { status: 429, headers: { 'x-rate-limit-reset': '250' } })
      )
      .mockResolvedValueOnce(jsonResponse([{ id: 1 }]))

    const client = new NuvemshopClient({
      storeId: '1',
      accessToken: 'tok',
      userAgent: 'Thymos Test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: sleep as unknown as (ms: number) => Promise<void>,
    })

    const result = await client.get('/products')
    expect(result).toEqual([{ id: 1 }])
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(250)
  })
})

describe('NuvemshopClient — falha de rede (timeout/DNS)', () => {
  it('tenta novamente e eventualmente lança o erro de rede após esgotar as tentativas', async () => {
    const networkError = new Error('fetch failed: ECONNRESET')
    const fetchImpl = vi.fn().mockRejectedValue(networkError)
    const client = new NuvemshopClient({
      storeId: '1',
      accessToken: 'tok',
      userAgent: 'Thymos Test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      maxRetries: 3,
      sleep: vi.fn().mockResolvedValue(undefined),
    })

    await expect(client.get('/products')).rejects.toThrow(/ECONNRESET/)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })
})

describe('NuvemshopClient — erro 5xx eventualmente recupera', () => {
  it('tenta novamente em 500 e resolve na segunda tentativa', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'Internal Server Error' }, { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ id: 42 }))

    const client = new NuvemshopClient({
      storeId: '1',
      accessToken: 'tok',
      userAgent: 'Thymos Test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: vi.fn().mockResolvedValue(undefined),
    })

    const result = await client.get('/products/1')
    expect(result).toEqual({ id: 42 })
  })
})

describe('NuvemshopClient — listAll (paginação)', () => {
  it('percorre todas as páginas até receber menos que per_page itens', async () => {
    const page1 = Array.from({ length: 50 }, (_, i) => ({ id: i }))
    const page2 = Array.from({ length: 12 }, (_, i) => ({ id: 50 + i }))
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(page1))
      .mockResolvedValueOnce(jsonResponse(page2))

    const client = new NuvemshopClient({
      storeId: '1',
      accessToken: 'tok',
      userAgent: 'Thymos Test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    const all = await client.listAll('/products')
    expect(all).toHaveLength(62)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('para em uma página vazia (produto inexistente / loja sem catálogo)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([]))
    const client = new NuvemshopClient({
      storeId: '1',
      accessToken: 'tok',
      userAgent: 'Thymos Test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    const all = await client.listAll('/products')
    expect(all).toEqual([])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

describe('NuvemshopClient — corpo de erro malformado', () => {
  it('não quebra quando a resposta de erro não é JSON válido', async () => {
    const badResponse = new Response('<html>Gateway Timeout</html>', { status: 504 })
    const fetchImpl = vi.fn().mockResolvedValue(badResponse)
    const client = new NuvemshopClient({
      storeId: '1',
      accessToken: 'tok',
      userAgent: 'Thymos Test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      maxRetries: 1,
      sleep: vi.fn().mockResolvedValue(undefined),
    })

    let caught: NuvemshopApiError | undefined
    try {
      await client.get('/products')
    } catch (e) {
      caught = e as NuvemshopApiError
    }
    expect(caught?.status).toBe(504)
    expect(caught?.body).toBeNull()
  })
})

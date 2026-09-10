import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAbacatePayClient } from '../src/lib/abacatepay.js'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

describe('createAbacatePayClient', () => {
  it('retorna null quando não há chave configurada (integração opcional)', () => {
    expect(createAbacatePayClient(null)).toBeNull()
  })

  it('retorna um cliente funcional quando há chave', () => {
    expect(createAbacatePayClient('abc_prod_fake')).not.toBeNull()
  })
})

describe('AbacatePayClient#createPaymentLink', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn()
  })
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('cria o produto avulso e depois o checkout, na ordem certa, e retorna o link', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: { id: 'prod_abc' }, success: true, error: null }))
      .mockResolvedValueOnce(jsonResponse({ data: { id: 'bill_xyz', url: 'https://app.abacatepay.com/pay/bill_xyz', status: 'PENDING' }, success: true, error: null }))

    const client = createAbacatePayClient('abc_prod_fake')!
    const link = await client.createPaymentLink({ name: 'Pedido Thymos #1 (1 item)', priceCents: 42900, externalId: 'pedido-1' })

    expect(link).toEqual({ checkoutId: 'bill_xyz', url: 'https://app.abacatepay.com/pay/bill_xyz', status: 'PENDING' })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const [productUrl, productInit] = fetchMock.mock.calls[0]
    expect(productUrl).toBe('https://api.abacatepay.com/v2/products/create')
    expect(productInit.headers.Authorization).toBe('Bearer abc_prod_fake')
    const productBody = JSON.parse(productInit.body)
    expect(productBody).toEqual({ externalId: 'pedido-1', name: 'Pedido Thymos #1 (1 item)', price: 42900, currency: 'BRL' })

    const [checkoutUrl, checkoutInit] = fetchMock.mock.calls[1]
    expect(checkoutUrl).toBe('https://api.abacatepay.com/v2/checkouts/create')
    const checkoutBody = JSON.parse(checkoutInit.body)
    expect(checkoutBody.items).toEqual([{ id: 'prod_abc', quantity: 1 }])
    expect(checkoutBody.externalId).toBe('pedido-1')
    expect(checkoutBody.methods).toEqual(['PIX', 'CARD'])
  })

  it('lança erro descritivo quando a criação do produto falha', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: null, success: false, error: 'chave inválida' }, false, 401))

    const client = createAbacatePayClient('abc_prod_fake')!
    await expect(client.createPaymentLink({ name: 'x', priceCents: 100, externalId: 'pedido-1' })).rejects.toThrow(/chave inválida/)
  })

  it('lança erro descritivo quando a criação do checkout falha (produto já criado)', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ data: { id: 'prod_abc' }, success: true, error: null }))
      .mockResolvedValueOnce(jsonResponse({ data: null, success: false, error: 'método de pagamento indisponível' }, false, 400))

    const client = createAbacatePayClient('abc_prod_fake')!
    await expect(client.createPaymentLink({ name: 'x', priceCents: 100, externalId: 'pedido-1' })).rejects.toThrow(/método de pagamento indisponível/)
  })
})

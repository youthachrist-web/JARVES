import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import type { AppConfig } from '../src/config.js'
import { InMemoryEventLogStore } from '../src/store/eventLogStore.js'
import type { Mailer } from '../src/lib/mailer.js'
import type { ProductsStore, Product } from '../src/store/productsStore.js'
import type { OrdersStore } from '../src/store/ordersStore.js'
import type { AbacatePayClient, PixCharge } from '../src/lib/abacatepay.js'

function baseConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: 0,
    corsAllowedOrigins: ['http://localhost:5173'],
    sessionSecret: 'session-secret',
    supabaseUrl: null,
    supabaseAnonKey: null,
    supabaseServiceRoleKey: null,
    smtp: null,
    adminAppUrl: null,
    nuvemshop: null,
    abacatePayApiKey: null,
    abacatePayWebhookSecret: null,
    storefrontUrl: null,
    ...overrides,
  }
}

const SAMPLE_PRODUCT: Product = {
  id: 1,
  name: 'Conjunto Aerobic Steel',
  category: 'Conjunto',
  price: 429,
  promotionalPrice: null,
  stock: 100,
  sizes: ['P', 'M', 'G'],
  colors: ['Steel'],
  description: 'desc',
  images: ['https://example.com/a.jpg'],
}

const SAMPLE_PRODUCT_PROMO: Product = {
  ...SAMPLE_PRODUCT,
  id: 2,
  name: 'Conjunto Onyx Power',
  price: 489,
  promotionalPrice: 399,
  stock: 3,
}

describe('GET /products', () => {
  it('retorna 503 quando o Supabase não está configurado (productsStore ausente)', async () => {
    const app = createApp(baseConfig())
    const res = await request(app).get('/products')
    expect(res.status).toBe(503)
  })

  it('libera CORS para qualquer origem nesta rota', async () => {
    const app = createApp(baseConfig())
    const res = await request(app).get('/products').set('Origin', 'https://youthachrist-web.github.io')
    expect(res.headers['access-control-allow-origin']).toBe('*')
  })
})

describe('POST /orders', () => {
  it('retorna 503 quando o Supabase não está configurado (productsStore/ordersStore ausentes)', async () => {
    const app = createApp(baseConfig())
    const res = await request(app)
      .post('/orders')
      .send({ customerName: 'Ana', customerEmail: 'ana@example.com', items: [{ productId: 1, qty: 1 }] })
    expect(res.status).toBe(503)
  })
})

// Testes de integração completa (com productsStore/ordersStore fake) —
// usam createApp diretamente com dependências injetadas via monkeypatch do
// módulo de config, já que CreateAppDeps hoje não aceita essas duas stores
// diretamente. Testamos o comportamento das rotas via um app construído à
// mão com os mesmos componentes do shopRouter.
import { shopRouter } from '../src/routes/shop.js'
import express from 'express'

function fakeProductsStore(products: Product[]): ProductsStore {
  return { listActive: vi.fn().mockResolvedValue(products) }
}

function fakeOrdersStore(nextId = 1, status: 'pendente' | 'pago' | null = 'pendente'): OrdersStore & { attachPayment: ReturnType<typeof vi.fn> } {
  return {
    create: vi.fn().mockResolvedValue({ id: nextId }),
    attachPayment: vi.fn().mockResolvedValue(undefined),
    markPaidByCheckoutId: vi.fn().mockResolvedValue(null),
    getStatus: vi.fn().mockResolvedValue(status),
  }
}

function fakeAbacatePayClient(charge: Partial<PixCharge> = {}): AbacatePayClient & { createPixCharge: ReturnType<typeof vi.fn> } {
  return {
    createPaymentLink: vi.fn(),
    createPixCharge: vi.fn().mockResolvedValue({
      checkoutId: 'pix_char_fake123',
      brCode: '00020160014BR.GOV.BCB.PIX070503***6304ABCD',
      brCodeBase64: 'data:image/png;base64,iVBORw0KG...',
      expiresAt: '2026-01-01T00:00:00.000Z',
      status: 'PENDING',
      ...charge,
    }),
  }
}

function buildShopApp(
  productsStore: ProductsStore | null,
  ordersStore: OrdersStore | null,
  opts: { mailer?: Mailer; abacatePayClient?: AbacatePayClient | null; storefrontUrl?: string | null } = {}
) {
  const app = express()
  app.use(express.json())
  const eventLog = new InMemoryEventLogStore()
  const sendMock = opts.mailer ?? ({ send: vi.fn().mockResolvedValue(undefined) } as Mailer)
  app.use(
    '/',
    shopRouter({
      productsStore,
      ordersStore,
      eventLog,
      mailer: sendMock,
      abacatePayClient: opts.abacatePayClient ?? null,
      storefrontUrl: opts.storefrontUrl ?? null,
    })
  )
  return { app, eventLog, mailer: sendMock }
}

describe('shopRouter — /products (integração)', () => {
  it('lista os produtos ativos normalizados', async () => {
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), null)
    const res = await request(app).get('/products')
    expect(res.status).toBe(200)
    expect(res.body.products).toEqual([SAMPLE_PRODUCT])
  })

  it('responde 503 sem quebrar quando a leitura do Supabase falha', async () => {
    const failing: ProductsStore = { listActive: vi.fn().mockRejectedValue(new Error('boom')) }
    const { app } = buildShopApp(failing, null)
    const res = await request(app).get('/products')
    expect(res.status).toBe(503)
  })
})

describe('shopRouter — /orders (integração)', () => {
  const VALID_CPF = '529.982.247-25' // CPF de teste com dígito verificador válido
  const validBody = {
    customerName: 'Ana Silva',
    customerEmail: 'ana@example.com',
    customerPhone: '11999999999',
    customerTaxId: VALID_CPF,
    items: [{ productId: 1, qty: 1 }],
  }

  it('rejeita corpo sem os campos obrigatórios', async () => {
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), fakeOrdersStore())
    const res = await request(app).post('/orders').send({ customerName: 'Ana' })
    expect(res.status).toBe(400)
  })

  it('rejeita CPF com dígito verificador inválido', async () => {
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), fakeOrdersStore())
    const res = await request(app)
      .post('/orders')
      .send({ ...validBody, customerTaxId: '111.111.111-11' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/CPF/)
  })

  it('rejeita item malformado (sem productId numérico ou qty positivo)', async () => {
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), fakeOrdersStore())
    const res = await request(app)
      .post('/orders')
      .send({ ...validBody, items: [{ productId: '1', qty: 0 }] })
    expect(res.status).toBe(400)
  })

  it('IGNORA preço/total enviados pelo cliente e recalcula do catálogo real', async () => {
    const orders = fakeOrdersStore(42)
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), orders)
    // Cliente tenta mandar um preço manipulado — deve ser ignorado por completo.
    const res = await request(app)
      .post('/orders')
      .send({ ...validBody, items: [{ productId: 1, qty: 1, price: 1, name: 'grátis' }] })

    expect(res.status).toBe(201)
    expect(res.body.subtotal).toBe(429) // preço real do catálogo, não o "1" enviado
    expect(res.body.total).toBe(429)
    expect(orders.create).toHaveBeenCalledWith(
      expect.objectContaining({ items: [{ productId: 1, name: SAMPLE_PRODUCT.name, price: 429, qty: 1 }], subtotal: 429, total: 429 })
    )
  })

  it('usa o preço promocional quando existe', async () => {
    const orders = fakeOrdersStore(1)
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT_PROMO]), orders)
    const res = await request(app)
      .post('/orders')
      .send({ ...validBody, items: [{ productId: 2, qty: 1 }] })
    expect(res.status).toBe(201)
    expect(res.body.subtotal).toBe(399)
  })

  it('rejeita productId inexistente no catálogo', async () => {
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), fakeOrdersStore())
    const res = await request(app)
      .post('/orders')
      .send({ ...validBody, items: [{ productId: 999, qty: 1 }] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/não encontrado/)
  })

  it('rejeita quantidade acima do estoque disponível (409)', async () => {
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT_PROMO]), fakeOrdersStore())
    const res = await request(app)
      .post('/orders')
      .send({ ...validBody, items: [{ productId: 2, qty: 999 }] })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/[Ee]stoque/)
  })

  it('aplica o cupão THYMOS10 corretamente (10% de desconto)', async () => {
    const orders = fakeOrdersStore(7)
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), orders)
    const res = await request(app)
      .post('/orders')
      .send({ ...validBody, couponCode: 'thymos10' }) // minúsculo/misto — precisa normalizar

    expect(res.status).toBe(201)
    expect(res.body.subtotal).toBe(429)
    expect(res.body.discount).toBe(43) // round(429 * 0.10)
    expect(res.body.total).toBe(386)
    expect(res.body.couponApplied).toBe('THYMOS10')
    expect(orders.create).toHaveBeenCalledWith(expect.objectContaining({ couponCode: 'THYMOS10', discount: 43, total: 386 }))
  })

  it('ignora cupão inválido em vez de rejeitar o pedido inteiro', async () => {
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), fakeOrdersStore())
    const res = await request(app)
      .post('/orders')
      .send({ ...validBody, couponCode: 'CUPOMFALSO' })

    expect(res.status).toBe(201)
    expect(res.body.discount).toBe(0)
    expect(res.body.total).toBe(429)
    expect(res.body.couponApplied).toBeNull()
  })

  it('cria o pedido, registra no log e notifica por e-mail', async () => {
    const orders = fakeOrdersStore(42)
    const mailer = { send: vi.fn().mockResolvedValue(undefined) }
    const { app, eventLog } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), orders, { mailer })
    const res = await request(app).post('/orders').send(validBody)

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ success: true, orderId: 42, subtotal: 429, discount: 0, total: 429, couponApplied: null, pix: null })
    expect(mailer.send).toHaveBeenCalledTimes(1)
    expect(mailer.send.mock.calls[0][0]).toMatch(/42/)

    const events = await eventLog.recent(10)
    expect(events.some((e) => e.message.includes('#42'))).toBe(true)
  })

  it('responde 201 normalmente mesmo quando o envio do e-mail de notificação falha (regressão: SMTP fora do ar/lento derrubava o processo inteiro)', async () => {
    const orders = fakeOrdersStore(43)
    const mailer = { send: vi.fn().mockRejectedValue(new Error('Connection timeout')) }
    const { app, eventLog } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), orders, { mailer })
    const res = await request(app).post('/orders').send(validBody)

    expect(res.status).toBe(201)
    expect(res.body.orderId).toBe(43)
    expect(mailer.send).toHaveBeenCalledTimes(1)

    // A falha do e-mail é assíncrona (disparada depois da resposta) — espera
    // a próxima volta do loop antes de checar o log de eventos.
    await new Promise((r) => setTimeout(r, 10))
    const events = await eventLog.recent(10)
    expect(events.some((e) => e.message.includes('Falha ao enviar e-mail') && e.message.includes('#43'))).toBe(true)
  })

  it('responde 503 sem quebrar quando salvar o pedido falha', async () => {
    const failing: OrdersStore = {
      create: vi.fn().mockRejectedValue(new Error('boom')),
      attachPayment: vi.fn(),
      markPaidByCheckoutId: vi.fn(),
      getStatus: vi.fn(),
    }
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), failing)
    const res = await request(app).post('/orders').send(validBody)
    expect(res.status).toBe(503)
  })

  describe('checkout Pix transparente (AbacatePay)', () => {
    it('gera a cobrança Pix e grava no pedido quando o cliente está configurado', async () => {
      const orders = fakeOrdersStore(10)
      const abacatePayClient = fakeAbacatePayClient()
      const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), orders, { abacatePayClient })

      const res = await request(app).post('/orders').send(validBody)

      expect(res.status).toBe(201)
      expect(res.body.pix).toEqual({
        checkoutId: 'pix_char_fake123',
        brCode: '00020160014BR.GOV.BCB.PIX070503***6304ABCD',
        brCodeBase64: 'data:image/png;base64,iVBORw0KG...',
        expiresAt: '2026-01-01T00:00:00.000Z',
      })
      expect(abacatePayClient.createPixCharge).toHaveBeenCalledWith(
        expect.objectContaining({
          amountCents: 42900,
          externalId: 'pedido-10',
          expiresIn: 1800,
          customer: expect.objectContaining({ name: 'Ana Silva', email: 'ana@example.com', taxId: '52998224725' }),
        })
      )
      expect(orders.attachPayment).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ provider: 'abacatepay', checkoutId: 'pix_char_fake123', url: null })
      )
    })

    it('usa o total JÁ com desconto (cupão) para calcular o valor em centavos da cobrança', async () => {
      const orders = fakeOrdersStore(11)
      const abacatePayClient = fakeAbacatePayClient()
      const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), orders, { abacatePayClient })

      await request(app).post('/orders').send({ ...validBody, couponCode: 'THYMOS10' })

      expect(abacatePayClient.createPixCharge).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 38600 })) // 386,00 em centavos
    })

    it('NUNCA falha o pedido inteiro se a geração da cobrança Pix der erro', async () => {
      const orders = fakeOrdersStore(12)
      const abacatePayClient: AbacatePayClient = {
        createPaymentLink: vi.fn(),
        createPixCharge: vi.fn().mockRejectedValue(new Error('AbacatePay fora do ar')),
      }
      const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), orders, { abacatePayClient })

      const res = await request(app).post('/orders').send(validBody)

      expect(res.status).toBe(201)
      expect(res.body.pix).toBeNull()
      expect(orders.attachPayment).not.toHaveBeenCalled()
    })

    it('não tenta gerar cobrança quando abacatePayClient é null (não configurado)', async () => {
      const orders = fakeOrdersStore(13)
      const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), orders, { abacatePayClient: null })
      const res = await request(app).post('/orders').send(validBody)
      expect(res.status).toBe(201)
      expect(res.body.pix).toBeNull()
    })
  })
})

describe('GET /orders/:id/status', () => {
  it('retorna 503 quando o Supabase não está configurado (ordersStore ausente)', async () => {
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), null)
    const res = await request(app).get('/orders/1/status')
    expect(res.status).toBe(503)
  })

  it('rejeita id inválido', async () => {
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), fakeOrdersStore())
    const res = await request(app).get('/orders/abc/status')
    expect(res.status).toBe(400)
  })

  it('retorna 404 quando o pedido não existe', async () => {
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), fakeOrdersStore(1, null))
    const res = await request(app).get('/orders/999/status')
    expect(res.status).toBe(404)
  })

  it('retorna o status atual do pedido (pendente ou pago)', async () => {
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), fakeOrdersStore(1, 'pago'))
    const res = await request(app).get('/orders/5/status')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'pago' })
  })

  it('libera CORS para qualquer origem nesta rota', async () => {
    const { app } = buildShopApp(fakeProductsStore([SAMPLE_PRODUCT]), fakeOrdersStore())
    const res = await request(app).get('/orders/5/status').set('Origin', 'https://youthachrist-web.github.io')
    expect(res.headers['access-control-allow-origin']).toBe('*')
  })
})

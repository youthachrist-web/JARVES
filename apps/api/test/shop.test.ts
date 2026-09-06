import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'
import type { AppConfig } from '../src/config.js'
import { InMemoryEventLogStore } from '../src/store/eventLogStore.js'
import type { Mailer } from '../src/lib/mailer.js'
import type { ProductsStore, Product } from '../src/store/productsStore.js'
import type { OrdersStore } from '../src/store/ordersStore.js'

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
  it('retorna 503 quando o Supabase não está configurado (ordersStore ausente)', async () => {
    const app = createApp(baseConfig())
    const res = await request(app)
      .post('/orders')
      .send({ customerName: 'Ana', customerEmail: 'ana@example.com', items: [{ productId: 1, name: 'X', price: 10, qty: 1 }], total: 10 })
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

function fakeOrdersStore(nextId = 1): OrdersStore {
  return { create: vi.fn().mockResolvedValue({ id: nextId }) }
}

function buildShopApp(productsStore: ProductsStore | null, ordersStore: OrdersStore | null, mailer?: Mailer) {
  const app = express()
  app.use(express.json())
  const eventLog = new InMemoryEventLogStore()
  const sendMock = mailer ?? ({ send: vi.fn().mockResolvedValue(undefined) } as Mailer)
  app.use('/', shopRouter({ productsStore, ordersStore, eventLog, mailer: sendMock }))
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
  const validBody = {
    customerName: 'Ana Silva',
    customerEmail: 'ana@example.com',
    customerPhone: '11999999999',
    items: [{ productId: 1, name: 'Conjunto Aerobic Steel', price: 429, qty: 1 }],
    total: 429,
  }

  it('rejeita corpo sem os campos obrigatórios', async () => {
    const { app } = buildShopApp(null, fakeOrdersStore())
    const res = await request(app).post('/orders').send({ customerName: 'Ana' })
    expect(res.status).toBe(400)
  })

  it('cria o pedido, registra no log e notifica por e-mail', async () => {
    const orders = fakeOrdersStore(42)
    const mailer = { send: vi.fn().mockResolvedValue(undefined) }
    const { app, eventLog } = buildShopApp(null, orders, mailer)
    const res = await request(app).post('/orders').send(validBody)

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ success: true, orderId: 42 })
    expect(orders.create).toHaveBeenCalledWith({
      customerName: validBody.customerName,
      customerEmail: validBody.customerEmail,
      customerPhone: validBody.customerPhone,
      items: validBody.items,
      total: validBody.total,
    })
    expect(mailer.send).toHaveBeenCalledTimes(1)
    expect(mailer.send.mock.calls[0][0]).toMatch(/42/)

    const events = await eventLog.recent(10)
    expect(events.some((e) => e.message.includes('#42'))).toBe(true)
  })

  it('responde 503 sem quebrar quando salvar o pedido falha', async () => {
    const failing: OrdersStore = { create: vi.fn().mockRejectedValue(new Error('boom')) }
    const { app } = buildShopApp(null, failing)
    const res = await request(app).post('/orders').send(validBody)
    expect(res.status).toBe(503)
  })
})

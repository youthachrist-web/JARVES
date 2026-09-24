import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { shippingRouter } from '../src/routes/shipping.js'
import type { ProductsStore, Product } from '../src/store/productsStore.js'
import type { MelhorEnvioClient, ShippingOption } from '../src/lib/melhorEnvio.js'

const DEFAULT_PACKAGE = { widthCm: 25, heightCm: 5, lengthCm: 20, weightKg: 0.3 }

const CHEAP_PRODUCT: Product = {
  id: 5,
  name: 'Top Esportivo',
  category: 'Top',
  price: 100,
  promotionalPrice: null,
  stock: 50,
  sizes: ['P', 'M', 'G'],
  colors: [],
  description: 'desc',
  images: [],
}

function fakeProductsStore(products: Product[]): ProductsStore {
  return { listActive: vi.fn().mockResolvedValue(products) }
}

function fakeMelhorEnvioClient(options: ShippingOption[] = []): MelhorEnvioClient & { calculate: ReturnType<typeof vi.fn> } {
  return { calculate: vi.fn().mockResolvedValue(options) }
}

function buildApp(opts: {
  productsStore?: ProductsStore | null
  melhorEnvioClient?: MelhorEnvioClient | null
  storeOriginCep?: string | null
  freeShippingThreshold?: number
} = {}) {
  const app = express()
  app.use(express.json())
  app.use(
    '/',
    shippingRouter({
      productsStore: 'productsStore' in opts ? opts.productsStore! : fakeProductsStore([CHEAP_PRODUCT]),
      melhorEnvioClient: 'melhorEnvioClient' in opts ? opts.melhorEnvioClient! : fakeMelhorEnvioClient(),
      storeOriginCep: 'storeOriginCep' in opts ? opts.storeOriginCep! : '88316400',
      freeShippingThreshold: opts.freeShippingThreshold ?? 299,
      defaultPackage: DEFAULT_PACKAGE,
    })
  )
  return app
}

describe('POST /shipping/quote', () => {
  it('libera CORS para qualquer origem', async () => {
    const app = buildApp()
    const res = await request(app)
      .post('/shipping/quote')
      .set('Origin', 'https://thymoswear.com.br')
      .send({ cep: '01018020', items: [{ productId: 5, qty: 1 }] })
    expect(res.headers['access-control-allow-origin']).toBe('*')
  })

  it('responde 503 quando a Melhor Envio não está configurada', async () => {
    const app = buildApp({ melhorEnvioClient: null })
    const res = await request(app)
      .post('/shipping/quote')
      .send({ cep: '01018020', items: [{ productId: 5, qty: 1 }] })
    expect(res.status).toBe(503)
  })

  it('responde 503 quando STORE_ORIGIN_CEP não está configurado, mesmo com token válido', async () => {
    const app = buildApp({ storeOriginCep: null })
    const res = await request(app)
      .post('/shipping/quote')
      .send({ cep: '01018020', items: [{ productId: 5, qty: 1 }] })
    expect(res.status).toBe(503)
  })

  it('rejeita CEP inválido', async () => {
    const app = buildApp()
    const res = await request(app)
      .post('/shipping/quote')
      .send({ cep: '123', items: [{ productId: 5, qty: 1 }] })
    expect(res.status).toBe(400)
  })

  it('rejeita items ausente/vazio', async () => {
    const app = buildApp()
    const res = await request(app).post('/shipping/quote').send({ cep: '01018020', items: [] })
    expect(res.status).toBe(400)
  })

  it('rejeita productId que não existe no catálogo', async () => {
    const app = buildApp()
    const res = await request(app)
      .post('/shipping/quote')
      .send({ cep: '01018020', items: [{ productId: 999, qty: 1 }] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/não encontrado/)
  })

  it('retorna free:true sem consultar a Melhor Envio quando o subtotal já bate o frete grátis', async () => {
    const expensiveProduct: Product = { ...CHEAP_PRODUCT, id: 6, price: 500 }
    const melhorEnvioClient = fakeMelhorEnvioClient()
    const app = buildApp({ productsStore: fakeProductsStore([expensiveProduct]), melhorEnvioClient })

    const res = await request(app)
      .post('/shipping/quote')
      .send({ cep: '01018020', items: [{ productId: 6, qty: 1 }] })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ free: true, options: [] })
    expect(melhorEnvioClient.calculate).not.toHaveBeenCalled()
  })

  it('cota o frete na Melhor Envio quando o subtotal fica abaixo do limite', async () => {
    const melhorEnvioClient = fakeMelhorEnvioClient([
      { id: 1, name: 'PAC', company: 'Correios', price: 25.5, deliveryTime: 9 },
      { id: 2, name: 'SEDEX', company: 'Correios', price: 40.2, deliveryTime: 4 },
    ])
    const app = buildApp({ melhorEnvioClient })

    const res = await request(app)
      .post('/shipping/quote')
      .send({ cep: '01018-020', items: [{ productId: 5, qty: 2 }] })

    expect(res.status).toBe(200)
    expect(res.body.free).toBe(false)
    expect(res.body.options).toHaveLength(2)
    expect(melhorEnvioClient.calculate).toHaveBeenCalledWith({
      originCep: '88316400',
      destinationCep: '01018020',
      packages: [
        {
          id: 'Top Esportivo',
          width: 25,
          height: 5,
          length: 20,
          weight: 0.3,
          insurance_value: 100,
          quantity: 2,
        },
      ],
    })
  })

  it('responde 503 sem quebrar quando a Melhor Envio falha', async () => {
    const melhorEnvioClient: MelhorEnvioClient = { calculate: vi.fn().mockRejectedValue(new Error('timeout')) }
    const app = buildApp({ melhorEnvioClient })

    const res = await request(app)
      .post('/shipping/quote')
      .send({ cep: '01018020', items: [{ productId: 5, qty: 1 }] })

    expect(res.status).toBe(503)
  })

  it('responde 503 quando o catálogo não está configurado', async () => {
    const app = buildApp({ productsStore: null })
    const res = await request(app)
      .post('/shipping/quote')
      .send({ cep: '01018020', items: [{ productId: 5, qty: 1 }] })
    expect(res.status).toBe(503)
  })
})

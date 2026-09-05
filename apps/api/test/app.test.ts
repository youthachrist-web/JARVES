import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { createHmac } from 'node:crypto'
import { createApp } from '../src/app.js'
import type { AppConfig } from '../src/config.js'
import { InMemoryCredentialsStore } from '../src/store/credentialsStore.js'
import { InMemoryEventLogStore } from '../src/store/eventLogStore.js'
import type { Mailer } from '../src/lib/mailer.js'

const APP_SECRET = 'test-secret'

function baseConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: 0,
    corsAllowedOrigins: ['http://localhost:5173'],
    sessionSecret: 'session-secret',
    supabaseUrl: null,
    supabaseAnonKey: null,
    supabaseServiceRoleKey: null,
    smtp: null,
    nuvemshop: {
      appId: '32653',
      appSecret: APP_SECRET,
      redirectUri: 'https://api.thymos.com.br/nuvemshop/callback',
      userAgent: 'Thymos Test',
      scopes: ['read_products'],
    },
    ...overrides,
  }
}

function sign(body: unknown) {
  const raw = JSON.stringify(body)
  return { raw, signature: createHmac('sha256', APP_SECRET).update(raw).digest('hex') }
}

describe('GET /health', () => {
  it('responde 200 com status das integrações', async () => {
    const app = createApp(baseConfig())
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.integrations.nuvemshop).toBe('configured')
  })

  it('reporta nuvemshop "not_configured" quando faltam credenciais (cenário sem credencial ainda disponível)', async () => {
    const app = createApp(baseConfig({ nuvemshop: null }))
    const res = await request(app).get('/health')
    expect(res.body.integrations.nuvemshop).toBe('not_configured')
  })
})

describe('GET /nuvemshop/status', () => {
  it('retorna connected:false quando não há credenciais salvas', async () => {
    const app = createApp(baseConfig(), { credentialsStore: new InMemoryCredentialsStore() })
    const res = await request(app).get('/nuvemshop/status')
    expect(res.status).toBe(200)
    expect(res.body.connected).toBe(false)
    expect(res.body.configured).toBe(true)
  })

  it('retorna configured:false quando o app Nuvemshop nem está configurado', async () => {
    const app = createApp(baseConfig({ nuvemshop: null }))
    const res = await request(app).get('/nuvemshop/status')
    expect(res.body).toEqual({ connected: false, configured: false, reason: expect.any(String) })
  })

  it('degrada para connected:false (sem derrubar o processo) quando o credentialsStore falha', async () => {
    // Regressão: um erro no credentialsStore.load() (ex.: tabela ausente no
    // Supabase) não pode virar uma rejeição de Promise não tratada — isso
    // derrubava o processo Node inteiro em produção (Express 4 não captura
    // erros assíncronos automaticamente).
    const credentialsStore: InMemoryCredentialsStore = new InMemoryCredentialsStore()
    credentialsStore.load = async () => {
      throw new Error('relation "configuracoes" does not exist')
    }
    const app = createApp(baseConfig(), { credentialsStore })
    const res = await request(app).get('/nuvemshop/status')
    expect(res.status).toBe(200)
    expect(res.body.connected).toBe(false)
    expect(res.body.configured).toBe(true)
    expect(res.body.error).toMatch(/configuracoes/)
  })
})

describe('GET /nuvemshop/callback', () => {
  it('rejeita quando o code está ausente', async () => {
    const app = createApp(baseConfig())
    const connectRes = await request(app).get('/nuvemshop/connect')
    const state = new URL(connectRes.headers.location).searchParams.get('state')!
    const res = await request(app).get(`/nuvemshop/callback?state=${encodeURIComponent(state)}`)
    expect(res.status).toBe(400)
  })

  it('rejeita state inválido/forjado (proteção CSRF)', async () => {
    const app = createApp(baseConfig())
    const res = await request(app).get('/nuvemshop/callback?code=abc&state=estado-forjado.assinatura-errada')
    expect(res.status).toBe(400)
  })
})

describe('POST /nuvemshop/sync/products — proteção por API key', () => {
  it('rejeita sem x-admin-api-key', async () => {
    const app = createApp(baseConfig())
    const res = await request(app).post('/nuvemshop/sync/products')
    expect(res.status).toBe(401)
  })

  it('rejeita com api key errada', async () => {
    const app = createApp(baseConfig())
    const res = await request(app).post('/nuvemshop/sync/products').set('x-admin-api-key', 'errada')
    expect(res.status).toBe(401)
  })

  it('retorna 503 quando a loja ainda não está conectada (mesmo com api key correta)', async () => {
    const app = createApp(baseConfig(), { credentialsStore: new InMemoryCredentialsStore() })
    const res = await request(app).post('/nuvemshop/sync/products').set('x-admin-api-key', 'session-secret')
    expect(res.status).toBe(503)
  })
})

describe('POST /webhooks/nuvemshop — validação de assinatura', () => {
  it('aceita webhook com assinatura válida', async () => {
    const app = createApp(baseConfig())
    const { raw, signature } = sign({ store_id: 1, event: 'product/updated', id: 5 })
    const res = await request(app)
      .post('/webhooks/nuvemshop')
      .set('Content-Type', 'application/json')
      .set('x-linkedstore-hmac-sha256', signature)
      .send(raw)
    expect(res.status).toBe(200)
    expect(res.body.received).toBe(true)
  })

  it('rejeita webhook sem header de assinatura', async () => {
    const app = createApp(baseConfig())
    const res = await request(app)
      .post('/webhooks/nuvemshop')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ store_id: 1, event: 'product/updated' }))
    expect(res.status).toBe(401)
  })

  it('rejeita webhook com assinatura adulterada', async () => {
    const app = createApp(baseConfig())
    const { signature } = sign({ store_id: 1, event: 'product/updated' })
    const res = await request(app)
      .post('/webhooks/nuvemshop')
      .set('Content-Type', 'application/json')
      .set('x-linkedstore-hmac-sha256', signature)
      .send(JSON.stringify({ store_id: 1, event: 'product/deleted' })) // corpo diferente do assinado
    expect(res.status).toBe(401)
  })

  it('deduplica reentrega do mesmo evento (retry da Nuvemshop)', async () => {
    const app = createApp(baseConfig())
    const { raw, signature } = sign({ store_id: 1, event: 'order/paid', id: 999 })

    const first = await request(app)
      .post('/webhooks/nuvemshop')
      .set('x-linkedstore-hmac-sha256', signature)
      .set('Content-Type', 'application/json')
      .send(raw)
    const second = await request(app)
      .post('/webhooks/nuvemshop')
      .set('x-linkedstore-hmac-sha256', signature)
      .set('Content-Type', 'application/json')
      .send(raw)

    expect(first.body).toEqual({ received: true })
    expect(second.body).toEqual({ received: true, deduped: true })
  })

  it('processa o webhook app/uninstalled limpando as credenciais salvas', async () => {
    const credentialsStore = new InMemoryCredentialsStore()
    await credentialsStore.save({ storeId: '1', accessToken: 'tok', connectedAt: new Date().toISOString() })
    const eventLog = new InMemoryEventLogStore()
    const app = createApp(baseConfig(), { credentialsStore, eventLog })

    const { raw, signature } = sign({ store_id: 1, event: 'app/uninstalled' })
    await request(app).post('/webhooks/nuvemshop').set('x-linkedstore-hmac-sha256', signature).set('Content-Type', 'application/json').send(raw)

    // processamento é assíncrono (fire-and-forget) — aguarda o próximo tick
    await new Promise((r) => setTimeout(r, 20))
    expect(await credentialsStore.load()).toBeNull()
  })

  it('notifica por e-mail (mailer) quando o app é desinstalado', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const mailer: Mailer = { send }
    const app = createApp(baseConfig(), { mailer })

    const { raw, signature } = sign({ store_id: 1, event: 'app/uninstalled' })
    await request(app).post('/webhooks/nuvemshop').set('x-linkedstore-hmac-sha256', signature).set('Content-Type', 'application/json').send(raw)

    await new Promise((r) => setTimeout(r, 20))
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0]).toMatch(/desinstalado/i)
  })

  it('notifica por e-mail (mailer) quando um pedido é pago', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const mailer: Mailer = { send }
    const app = createApp(baseConfig(), { mailer })

    const { raw, signature } = sign({ store_id: 1, event: 'order/paid', id: 42 })
    await request(app).post('/webhooks/nuvemshop').set('x-linkedstore-hmac-sha256', signature).set('Content-Type', 'application/json').send(raw)

    await new Promise((r) => setTimeout(r, 20))
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0]).toMatch(/42/)
  })

  it('responde 503 quando o app secret não está configurado (credencial pendente do proprietário)', async () => {
    const app = createApp(baseConfig({ nuvemshop: null }))
    const res = await request(app)
      .post('/webhooks/nuvemshop')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ store_id: 1, event: 'product/updated' }))
    expect(res.status).toBe(503)
  })

  it('rejeita payload malformado mesmo com assinatura válida', async () => {
    const app = createApp(baseConfig())
    const raw = '{ "store_id": 1, "event": '
    const signature = createHmac('sha256', APP_SECRET).update(raw).digest('hex')
    const res = await request(app)
      .post('/webhooks/nuvemshop')
      .set('x-linkedstore-hmac-sha256', signature)
      .set('Content-Type', 'application/json')
      .send(raw)
    // O parser de JSON do Express já rejeita corpo malformado antes de chegar na rota
    expect(res.status).toBe(400)
  })
})

describe('GET /webhooks/nuvemshop/required-topics', () => {
  it('lista os 3 tópicos LGPD obrigatórios para homologação do app', async () => {
    const app = createApp(baseConfig())
    const res = await request(app).get('/webhooks/nuvemshop/required-topics')
    expect(res.body.required).toEqual(['store/redact', 'customers/redact', 'customers/data_request'])
  })
})

describe('rota inexistente', () => {
  it('retorna 404 com mensagem clara', async () => {
    const app = createApp(baseConfig())
    const res = await request(app).get('/rota/que/nao/existe')
    expect(res.status).toBe(404)
  })
})

import express, { type Express } from 'express'
import { InMemoryIdempotencyStore } from '@thymos/nuvemshop-sdk'
import type { AppConfig } from './config.js'
import type { CredentialsStore } from './store/credentialsStore.js'
import { InMemoryCredentialsStore } from './store/credentialsStore.js'
import { SupabaseCredentialsStore } from './store/supabaseCredentialsStore.js'
import { ResilientCredentialsStore } from './store/resilientCredentialsStore.js'
import type { EventLogStore } from './store/eventLogStore.js'
import { InMemoryEventLogStore } from './store/eventLogStore.js'
import { healthRouter } from './routes/health.js'
import { nuvemshopRouter } from './routes/nuvemshop.js'
import { webhooksRouter } from './routes/webhooks.js'
import { captureRawBody } from './middlewares/rawBody.js'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js'
import type { Mailer } from './lib/mailer.js'
import { createMailer } from './lib/mailer.js'
import { logger } from './logger.js'

export interface CreateAppDeps {
  credentialsStore?: CredentialsStore
  eventLog?: EventLogStore
  mailer?: Mailer
}

function corsMiddleware(allowedOrigins: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const origin = req.header('origin')
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-api-key')
    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }
    next()
  }
}

export function createApp(config: AppConfig, deps: CreateAppDeps = {}): Express {
  const app = express()

  const credentialsStore =
    deps.credentialsStore ??
    (config.supabaseUrl && config.supabaseServiceRoleKey
      ? // O Supabase é a fonte de verdade quando configurado, mas nunca deve
        // bloquear a conexão da loja se estiver fora do ar/mal configurado
        // (URL inválida, tabela ausente, etc.) — por isso passa por um
        // fallback resiliente em memória (ver resilientCredentialsStore.ts).
        new ResilientCredentialsStore(new SupabaseCredentialsStore(config.supabaseUrl, config.supabaseServiceRoleKey))
      : new InMemoryCredentialsStore())

  const eventLog = deps.eventLog ?? new InMemoryEventLogStore()
  const idempotencyStore = new InMemoryIdempotencyStore()
  const mailer = deps.mailer ?? createMailer(config.smtp)

  app.disable('x-powered-by')
  app.use(corsMiddleware(config.corsAllowedOrigins))

  // `captureRawBody` faz o parse de JSON preservando o corpo bruto em
  // `req.rawBody`, necessário para validar a assinatura HMAC dos webhooks
  // (calculada sobre os bytes exatos recebidos, não sobre o objeto
  // reparseado) — por isso é aplicado globalmente, antes de qualquer rota.
  app.use(captureRawBody)

  app.use('/webhooks', webhooksRouter({ config, credentialsStore, eventLog, idempotencyStore, mailer }))
  app.use('/', healthRouter(config))
  app.use('/nuvemshop', nuvemshopRouter({ config, credentialsStore, eventLog }))

  app.use(notFoundHandler)
  app.use(errorHandler)

  logger.info('Aplicação Express inicializada', {
    nuvemshopConfigured: !!config.nuvemshop,
    supabaseConfigured: !!config.supabaseUrl,
    smtpConfigured: !!config.smtp,
  })

  return app
}

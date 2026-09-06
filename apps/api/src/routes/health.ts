import { Router } from 'express'
import type { AppConfig } from '../config.js'

export function healthRouter(config: AppConfig): Router {
  const router = Router()

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      integrations: {
        nuvemshop: config.nuvemshop ? 'configured' : 'not_configured',
        supabase: config.supabaseUrl ? 'configured' : 'not_configured',
      },
    })
  })

  return router
}

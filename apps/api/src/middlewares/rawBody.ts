import type { Request, Response, NextFunction } from 'express'
import express from 'express'

declare module 'express-serve-static-core' {
  interface Request {
    rawBody?: Buffer
  }
}

/**
 * Captura o corpo bruto da requisição ANTES do parse de JSON, necessário
 * para validar a assinatura HMAC dos webhooks da Nuvemshop (a assinatura é
 * calculada sobre os bytes exatos enviados, não sobre o objeto reparseado).
 */
export const captureRawBody = express.json({
  verify: (req: Request, _res: Response, buf: Buffer) => {
    req.rawBody = Buffer.from(buf)
  },
})

export function requireRawBody(req: Request, res: Response, next: NextFunction) {
  if (!req.rawBody) {
    res.status(400).json({ error: 'Corpo da requisição ausente ou não capturado' })
    return
  }
  next()
}

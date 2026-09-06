import type { Request, Response, NextFunction } from 'express'
import { logger } from '../logger.js'

/** Handler de erro central — nunca vaza stack trace/detalhes internos ao cliente. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const status = (err as { status?: number })?.status ?? 500
  const message = err instanceof Error ? err.message : 'Erro desconhecido'

  logger.error('Erro não tratado na requisição', {
    path: req.path,
    method: req.method,
    status,
    message,
  })

  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: status === 500 ? 'Erro interno do servidor' : message,
  })
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` })
}

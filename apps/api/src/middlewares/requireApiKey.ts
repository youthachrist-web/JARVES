import type { Request, Response, NextFunction } from 'express'

/**
 * Protege endpoints administrativos sensíveis (ex.: disparo manual de
 * sincronização) com uma chave simples enviada via header `x-admin-api-key`.
 * Isso evita que qualquer visitante do storefront público consiga acionar
 * rotinas de sincronização ou ver dados de configuração.
 *
 * Em produção, o painel admin (apps/admin) deve enviar este header a partir
 * de uma sessão autenticada — não deve ser embutido em código client-side
 * público.
 */
export function requireApiKey(expectedKey: string | null) {
  return function (req: Request, res: Response, next: NextFunction) {
    if (!expectedKey) {
      // Nenhuma chave configurada ainda (SESSION_SECRET ausente) — o
      // proprietário do projeto ainda não terminou a configuração de
      // segredos. Bloqueia por padrão em vez de deixar aberto.
      res.status(503).json({
        error: 'Endpoint administrativo indisponível: SESSION_SECRET não configurado no ambiente.',
      })
      return
    }
    const provided = req.header('x-admin-api-key')
    if (provided !== expectedKey) {
      res.status(401).json({ error: 'Não autorizado' })
      return
    }
    next()
  }
}

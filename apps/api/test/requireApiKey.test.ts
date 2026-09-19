import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import { requireApiKey } from '../src/middlewares/requireApiKey.js'

function fakeReqRes(headerValue: string | undefined) {
  const req = { header: () => headerValue } as unknown as Request
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))
  const res = { status } as unknown as Response
  const next = vi.fn()
  return { req, res, next, status, json }
}

describe('requireApiKey', () => {
  it('responde 503 quando nenhuma chave está configurada (SESSION_SECRET ausente)', () => {
    const { req, res, next, status } = fakeReqRes('qualquer-coisa')
    requireApiKey(null)(req, res, next)
    expect(status).toHaveBeenCalledWith(503)
    expect(next).not.toHaveBeenCalled()
  })

  it('responde 401 quando o header x-admin-api-key está ausente', () => {
    const { req, res, next, status } = fakeReqRes(undefined)
    requireApiKey('segredo-correto')(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('responde 401 quando a chave enviada está errada', () => {
    const { req, res, next, status } = fakeReqRes('chave-errada')
    requireApiKey('segredo-correto')(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('responde 401 quando a chave enviada tem tamanho diferente da esperada (sem lançar)', () => {
    const { req, res, next, status } = fakeReqRes('curta')
    requireApiKey('segredo-bem-mais-longo-que-isso')(req, res, next)
    expect(status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('chama next() quando a chave enviada bate com a esperada', () => {
    const { req, res, next } = fakeReqRes('segredo-correto')
    requireApiKey('segredo-correto')(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })
})

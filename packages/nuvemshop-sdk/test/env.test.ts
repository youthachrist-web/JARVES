import { describe, it, expect, vi } from 'vitest'
import { loadNuvemshopEnv, MissingEnvError } from '../src/env.js'

describe('loadNuvemshopEnv', () => {
  it('carrega config válida com todos os campos obrigatórios', () => {
    const config = loadNuvemshopEnv({
      NUVEMSHOP_APP_ID: '32653',
      NUVEMSHOP_APP_SECRET: 'segredo',
      NUVEMSHOP_REDIRECT_URI: 'https://app.com/callback',
    })
    expect(config).toMatchObject({ appId: '32653', appSecret: 'segredo', redirectUri: 'https://app.com/callback' })
    expect(config?.scopes).toContain('read_products')
  })

  it('lança MissingEnvError quando faltam variáveis obrigatórias (credencial ainda não configurada)', () => {
    expect(() => loadNuvemshopEnv({})).toThrow(MissingEnvError)
  })

  it('retorna null (sem lançar) quando allowMissing=true, permitindo continuar em modo mock', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const config = loadNuvemshopEnv({}, { allowMissing: true })
    expect(config).toBeNull()
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('lista exatamente as variáveis que faltam', () => {
    try {
      loadNuvemshopEnv({ NUVEMSHOP_APP_ID: '32653' })
      expect.unreachable()
    } catch (e) {
      expect((e as MissingEnvError).missing).toEqual(['NUVEMSHOP_APP_SECRET', 'NUVEMSHOP_REDIRECT_URI'])
    }
  })
})

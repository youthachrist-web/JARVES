import { describe, it, expect, vi, afterEach } from 'vitest'
import { createOAuthState, verifyOAuthState } from '../src/nuvemshopState.js'

const SECRET = 'session-secret-de-teste'

describe('OAuth state (CSRF do fluxo Nuvemshop)', () => {
  afterEach(() => vi.useRealTimers())

  it('gera e valida um state recém-criado', () => {
    const state = createOAuthState(SECRET)
    expect(verifyOAuthState(state, SECRET)).toBe(true)
  })

  it('rejeita state ausente', () => {
    expect(verifyOAuthState(undefined, SECRET)).toBe(false)
  })

  it('rejeita state assinado com secret diferente (link forjado)', () => {
    const state = createOAuthState('outro-secret')
    expect(verifyOAuthState(state, SECRET)).toBe(false)
  })

  it('rejeita state expirado (mais velho que maxAgeMs)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const state = createOAuthState(SECRET)
    vi.setSystemTime(new Date('2026-01-01T00:20:00Z')) // 20 minutos depois
    expect(verifyOAuthState(state, SECRET, 15 * 60 * 1000)).toBe(false)
  })

  it('rejeita state malformado', () => {
    expect(verifyOAuthState('nao-tem-ponto', SECRET)).toBe(false)
    expect(verifyOAuthState('123.', SECRET)).toBe(false)
  })
})

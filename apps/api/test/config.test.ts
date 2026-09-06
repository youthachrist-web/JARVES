import { describe, it, expect } from 'vitest'
import { loadConfig } from '../src/config.js'

const BASE_ENV = {
  NUVEMSHOP_APP_ID: '32653',
  NUVEMSHOP_APP_SECRET: 'secret',
  NUVEMSHOP_REDIRECT_URI: 'https://api.thymos.com.br/nuvemshop/callback',
  NUVEMSHOP_USER_AGENT: 'Thymos Test',
}

describe('loadConfig — adminAppUrl', () => {
  it('usa ADMIN_APP_URL quando definida explicitamente', () => {
    const config = loadConfig({ ...BASE_ENV, ADMIN_APP_URL: 'https://thymosadmin-production.up.railway.app' })
    expect(config.adminAppUrl).toBe('https://thymosadmin-production.up.railway.app')
  })

  it('cai para a primeira origem de CORS quando ADMIN_APP_URL não está definida', () => {
    const config = loadConfig({ ...BASE_ENV, CORS_ALLOWED_ORIGINS: 'https://thymosadmin-production.up.railway.app,https://outra.com' })
    expect(config.adminAppUrl).toBe('https://thymosadmin-production.up.railway.app')
  })

  it('nunca usa uma origem localhost em produção — cai para null em vez de quebrar o iframe da Nuvemshop', () => {
    const config = loadConfig({ ...BASE_ENV, CORS_ALLOWED_ORIGINS: 'http://localhost:5173' })
    expect(config.adminAppUrl).toBeNull()
  })

  it('fica null quando nenhuma origem de CORS está configurada', () => {
    const config = loadConfig({ ...BASE_ENV, CORS_ALLOWED_ORIGINS: '' })
    expect(config.adminAppUrl).toBeNull()
  })
})

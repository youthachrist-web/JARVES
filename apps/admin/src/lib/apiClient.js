import { loadSettings } from './settings.js'

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.status = status
    this.body = body
  }
}

/**
 * Cliente HTTP fino para apps/api. Lê base URL e a chave admin das
 * configurações locais (ver settings.js) — nunca de um valor embutido no
 * bundle. Rotas administrativas (sync, push, disconnect, logs) recebem o
 * header `x-admin-api-key`; rotas públicas (status, health) funcionam sem.
 */
async function request(path, { method = 'GET', body, auth = false } = {}) {
  const { apiBaseUrl, adminApiKey } = loadSettings()
  const headers = { 'Content-Type': 'application/json' }
  if (auth) headers['x-admin-api-key'] = adminApiKey

  let res
  try {
    res = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (networkErr) {
    throw new ApiError(
      `Não foi possível conectar à API (${apiBaseUrl}). Verifique se apps/api está rodando e a URL está correta em Configurações.`,
      0,
      null
    )
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(data?.error || `Erro ${res.status}`, res.status, data)
  }
  return data
}

export const api = {
  health: () => request('/health'),
  nuvemshopStatus: () => request('/nuvemshop/status'),
  nuvemshopConnectUrl: (baseUrl) => `${baseUrl}/nuvemshop/connect`,
  disconnect: () => request('/nuvemshop/disconnect', { method: 'POST', auth: true }),
  syncProducts: () => request('/nuvemshop/sync/products', { method: 'POST', auth: true }),
  syncOrders: (status) => request(`/nuvemshop/sync/orders${status ? `?status=${status}` : ''}`, { auth: true }),
  syncCustomers: () => request('/nuvemshop/sync/customers', { auth: true }),
  pushProduct: (action, product) => request('/nuvemshop/push/products', { method: 'POST', auth: true, body: { action, product } }),
  logs: (limit = 50) => request(`/nuvemshop/logs?limit=${limit}`, { auth: true }),
}

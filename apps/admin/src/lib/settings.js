/**
 * Configurações locais do painel — SEMPRE guardadas em localStorage, NUNCA
 * hardcoded no bundle. A "chave de API admin" aqui é a mesma
 * `SESSION_SECRET` configurada em apps/api (ver .env.example); o admin que
 * acessa este painel cola-a uma vez no navegador dele. Isso evita que o
 * segredo apareça em qualquer arquivo versionado ou no bundle JS público.
 */

const STORAGE_KEY = 'thymos-admin-settings'

const DEFAULTS = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  adminApiKey: '',
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

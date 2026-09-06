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

/**
 * Sincroniza `apiBaseUrl` a partir de `?apiBaseUrl=` na query string, quando
 * presente — é assim que apps/api informa a este painel qual é a sua
 * própria URL pública ao redirecionar o app incorporado da Nuvemshop (ver
 * routes/nuvemshop.ts, buildAdminRedirectUrl). Sem isso, o painel dependeria
 * de `VITE_API_BASE_URL` estar certa desde o build do Vite — uma variável
 * setada depois no Railway sem disparar um novo build nunca teria efeito, e
 * o painel continuaria batendo em `http://localhost:3000` mesmo em produção.
 *
 * Deve ser chamada de forma síncrona ANTES de qualquer render/fetch (ver
 * main.jsx) — não dentro de um useEffect de um componente filho, que
 * rodaria tarde demais e deixaria a primeira leitura do Dashboard usar o
 * valor antigo salvo no localStorage.
 */
export function syncApiBaseUrlFromQuery() {
  try {
    const apiBaseUrl = new URLSearchParams(window.location.search).get('apiBaseUrl')
    if (!apiBaseUrl) return
    saveSettings({ ...loadSettings(), apiBaseUrl })
  } catch {
    // Sem localStorage disponível (raro) — o painel segue com o valor
    // padrão/já salvo, sem quebrar o carregamento.
  }
}

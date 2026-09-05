import type { NuvemshopApiError, RateLimitInfo } from './types.js'

export const API_BASE_URL = 'https://api.tiendanube.com/v1'

export interface NuvemshopClientOptions {
  storeId: string | number
  accessToken: string
  userAgent: string
  fetchImpl?: typeof fetch
  /** Número máximo de tentativas em erros retryable (429/5xx/rede). Padrão: 4. */
  maxRetries?: number
  /** Atraso base (ms) do backoff exponencial. Padrão: 500ms. */
  baseDelayMs?: number
  /** Função de espera injetável — facilita testes (evita esperas reais). */
  sleep?: (ms: number) => Promise<void>
  /** Callback de observabilidade opcional (logging estruturado, métricas). */
  onRequestLog?: (entry: RequestLogEntry) => void
}

export interface RequestLogEntry {
  method: string
  path: string
  status: number
  attempt: number
  rateLimit: RateLimitInfo
  durationMs: number
}

function parseRateLimit(headers: Headers): RateLimitInfo {
  const limit = headers.get('x-rate-limit-limit')
  const remaining = headers.get('x-rate-limit-remaining')
  const resetMs = headers.get('x-rate-limit-reset')
  return {
    limit: limit ? Number(limit) : null,
    remaining: remaining ? Number(remaining) : null,
    resetMs: resetMs ? Number(resetMs) : null,
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Cliente HTTP de baixo nível para a API da Nuvemshop (v1). Cuida de:
 *  - headers obrigatórios (Authentication, User-Agent, Content-Type);
 *  - retry com backoff exponencial + jitter para 429 e 5xx (nunca para 4xx
 *    de validação, que são erros do chamador e não devem ser repetidos);
 *  - respeito ao rate limit informado pelos headers `x-rate-limit-*`
 *    (leaky bucket por loja+app) — se `remaining` chega a 0, aguarda
 *    `resetMs` antes de tentar de novo;
 *  - paginação via `listAll`.
 */
export class NuvemshopClient {
  private readonly storeId: string | number
  private readonly accessToken: string
  private readonly userAgent: string
  private readonly fetchImpl: typeof fetch
  private readonly maxRetries: number
  private readonly baseDelayMs: number
  private readonly sleep: (ms: number) => Promise<void>
  private readonly onRequestLog?: (entry: RequestLogEntry) => void

  constructor(opts: NuvemshopClientOptions) {
    this.storeId = opts.storeId
    this.accessToken = opts.accessToken
    this.userAgent = opts.userAgent
    this.fetchImpl = opts.fetchImpl ?? fetch
    this.maxRetries = opts.maxRetries ?? 4
    this.baseDelayMs = opts.baseDelayMs ?? 500
    this.sleep = opts.sleep ?? defaultSleep
    this.onRequestLog = opts.onRequestLog
  }

  private isRetryableStatus(status: number): boolean {
    return status === 429 || (status >= 500 && status < 600)
  }

  async request<T = unknown>(
    method: string,
    path: string,
    { query, body }: { query?: Record<string, string | number | undefined>; body?: unknown } = {}
  ): Promise<T> {
    const url = new URL(`${API_BASE_URL}/${this.storeId}${path}`)
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value))
      }
    }

    let lastError: unknown
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const startedAt = Date.now()
      let res: Response
      try {
        res = await this.fetchImpl(url.toString(), {
          method,
          headers: {
            Authentication: `bearer ${this.accessToken}`,
            'User-Agent': this.userAgent,
            'Content-Type': 'application/json',
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        })
      } catch (networkErr) {
        lastError = networkErr
        if (attempt < this.maxRetries) {
          await this.sleep(this.backoffDelay(attempt))
          continue
        }
        throw networkErr
      }

      const rateLimit = parseRateLimit(res.headers)
      this.onRequestLog?.({
        method,
        path,
        status: res.status,
        attempt,
        rateLimit,
        durationMs: Date.now() - startedAt,
      })

      if (res.ok) {
        if (res.status === 204) return undefined as T
        return (await res.json()) as T
      }

      const responseBody = await res.json().catch(() => null)

      if (this.isRetryableStatus(res.status) && attempt < this.maxRetries) {
        const waitMs =
          res.status === 429 && rateLimit.resetMs ? rateLimit.resetMs : this.backoffDelay(attempt)
        await this.sleep(waitMs)
        continue
      }

      const err = new Error(
        `Nuvemshop API error ${res.status} em ${method} ${path}`
      ) as NuvemshopApiError
      err.status = res.status
      err.body = responseBody
      err.retryable = this.isRetryableStatus(res.status)
      throw err
    }

    throw lastError instanceof Error ? lastError : new Error('Falha desconhecida na requisição à Nuvemshop')
  }

  private backoffDelay(attempt: number): number {
    const exp = this.baseDelayMs * 2 ** (attempt - 1)
    const jitter = Math.random() * this.baseDelayMs
    return exp + jitter
  }

  get<T = unknown>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    return this.request<T>('GET', path, { query })
  }
  post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, { body })
  }
  put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, { body })
  }
  delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }

  /** Percorre todas as páginas de um recurso paginado (50 itens por página, conforme limite da API). */
  async listAll<T = unknown>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T[]> {
    const perPage = 50
    let page = 1
    const all: T[] = []
    while (true) {
      const batch = await this.get<T[]>(path, { ...query, per_page: perPage, page })
      if (!Array.isArray(batch) || batch.length === 0) break
      all.push(...batch)
      if (batch.length < perPage) break
      page++
    }
    return all
  }
}

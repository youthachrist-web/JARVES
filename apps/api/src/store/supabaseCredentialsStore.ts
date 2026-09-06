import type { StoredNuvemshopCredentials } from '@thymos/nuvemshop-sdk'
import type { CredentialsStore } from './credentialsStore.js'

interface ConfigRow {
  chave: string
  valor: string
  atualizado_em?: string
}

/**
 * Persiste as credenciais Nuvemshop na tabela `configuracoes` do Supabase,
 * usando a service role key (backend-only — nunca expor esta chave ao
 * frontend). Mantém o mesmo esquema de chave/valor já usado na integração
 * original, para não exigir migração de dados em lojas já conectadas.
 */
export class SupabaseCredentialsStore implements CredentialsStore {
  constructor(
    private readonly supabaseUrl: string,
    private readonly serviceRoleKey: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private headers(extra: Record<string, string> = {}) {
    return {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...extra,
    }
  }

  async save(creds: StoredNuvemshopCredentials): Promise<void> {
    const upsert = async (chave: string, valor: string) => {
      // `Prefer: resolution=merge-duplicates` sozinho NÃO faz o PostgREST
      // tratar isto como upsert — é preciso informar explicitamente qual
      // coluna é o alvo do conflito via `?on_conflict=chave` na URL. Sem
      // isso, a primeira gravação de cada chave funciona (INSERT puro), mas
      // toda atualização seguinte falha com 409 "duplicate key value
      // violates unique constraint" — e como ResilientCredentialsStore
      // engole esse erro (para nunca travar a conexão), o sintoma era uma
      // credencial "presa" na primeira loja conectada, nunca atualizada em
      // reconexões futuras, sem nenhum aviso visível além do log.
      const res = await this.fetchImpl(`${this.supabaseUrl}/rest/v1/configuracoes?on_conflict=chave`, {
        method: 'POST',
        headers: this.headers({ Prefer: 'resolution=merge-duplicates' }),
        body: JSON.stringify({ chave, valor, atualizado_em: creds.connectedAt }),
      })
      if (!res.ok) {
        throw new Error(`Falha ao salvar configuração "${chave}" no Supabase (status ${res.status})`)
      }
    }

    await upsert('nuvemshop_access_token', creds.accessToken)
    await upsert('nuvemshop_store_id', creds.storeId)
    if (creds.scope) await upsert('nuvemshop_scope', creds.scope)
  }

  async load(): Promise<StoredNuvemshopCredentials | null> {
    const res = await this.fetchImpl(
      `${this.supabaseUrl}/rest/v1/configuracoes?select=chave,valor,atualizado_em&chave=in.(nuvemshop_access_token,nuvemshop_store_id,nuvemshop_scope)`,
      { headers: this.headers() }
    )
    if (!res.ok) throw new Error(`Falha ao carregar configuração do Supabase (status ${res.status})`)

    const rows = (await res.json()) as ConfigRow[]
    const map = Object.fromEntries(rows.map((r) => [r.chave, r]))
    const accessToken = map['nuvemshop_access_token']?.valor
    const storeId = map['nuvemshop_store_id']?.valor

    if (!accessToken || !storeId) return null

    return {
      accessToken,
      storeId,
      scope: map['nuvemshop_scope']?.valor,
      connectedAt: map['nuvemshop_access_token']?.atualizado_em ?? new Date(0).toISOString(),
    }
  }

  async clear(): Promise<void> {
    const res = await this.fetchImpl(
      `${this.supabaseUrl}/rest/v1/configuracoes?chave=in.(nuvemshop_access_token,nuvemshop_store_id,nuvemshop_scope)`,
      { method: 'DELETE', headers: this.headers() }
    )
    if (!res.ok) throw new Error(`Falha ao limpar configuração no Supabase (status ${res.status})`)
  }
}

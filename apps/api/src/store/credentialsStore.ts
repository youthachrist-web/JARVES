import type { StoredNuvemshopCredentials } from '@thymos/nuvemshop-sdk'

/**
 * Abstração de persistência para as credenciais Nuvemshop (access_token +
 * store_id) e para deduplicação de webhooks. Permite trocar Supabase por
 * outro banco sem tocar nas rotas.
 */
export interface CredentialsStore {
  save(creds: StoredNuvemshopCredentials): Promise<void>
  load(): Promise<StoredNuvemshopCredentials | null>
  clear(): Promise<void>
}

/**
 * Implementação em memória — usada em testes e como fallback de
 * desenvolvimento quando o Supabase não está configurado. NUNCA usar em
 * produção (dados perdidos a cada restart do processo).
 */
export class InMemoryCredentialsStore implements CredentialsStore {
  private current: StoredNuvemshopCredentials | null = null

  async save(creds: StoredNuvemshopCredentials): Promise<void> {
    this.current = creds
  }

  async load(): Promise<StoredNuvemshopCredentials | null> {
    return this.current
  }

  async clear(): Promise<void> {
    this.current = null
  }
}

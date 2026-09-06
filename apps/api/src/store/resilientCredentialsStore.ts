import type { StoredNuvemshopCredentials } from '@thymos/nuvemshop-sdk'
import type { CredentialsStore } from './credentialsStore.js'
import { InMemoryCredentialsStore } from './credentialsStore.js'
import { logger } from '../logger.js'

/**
 * Envolve um CredentialsStore "principal" (ex.: Supabase) com um fallback em
 * memória. Se o principal falhar (ex.: SUPABASE_URL inválida, projeto fora
 * do ar, tabela ausente), a loja ainda consegue se conectar e operar durante
 * o processo atual — só perde a durabilidade entre restarts, em vez de
 * ficar completamente bloqueada por uma credencial externa quebrada.
 *
 * Sempre grava no fallback também (write-through), para que uma queda do
 * principal a meio da sessão não perca o que já foi salvo. Assim que o
 * principal voltar a responder, volta a ser a fonte de verdade sozinho —
 * não é preciso reiniciar nem reconfigurar nada.
 */
export class ResilientCredentialsStore implements CredentialsStore {
  constructor(
    private readonly primary: CredentialsStore,
    private readonly fallback: CredentialsStore = new InMemoryCredentialsStore()
  ) {}

  private warn(operation: string, err: unknown) {
    logger.warn(`Armazenamento principal de credenciais falhou (${operation}) — usando fallback em memória`, {
      message: (err as Error).message,
    })
  }

  async save(creds: StoredNuvemshopCredentials): Promise<void> {
    try {
      await this.primary.save(creds)
    } catch (err) {
      this.warn('save', err)
    }
    // write-through: garante que load() funcione mesmo se o principal caiu
    // durante o autoinstrumento, sem depender de retentar toda vez.
    await this.fallback.save(creds)
  }

  async load(): Promise<StoredNuvemshopCredentials | null> {
    try {
      const creds = await this.primary.load()
      if (creds) return creds
    } catch (err) {
      this.warn('load', err)
    }
    return this.fallback.load()
  }

  async clear(): Promise<void> {
    const results = await Promise.allSettled([this.primary.clear(), this.fallback.clear()])
    for (const r of results) {
      if (r.status === 'rejected') this.warn('clear', r.reason)
    }
  }
}

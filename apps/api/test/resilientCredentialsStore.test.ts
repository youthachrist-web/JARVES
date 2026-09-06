import { describe, it, expect, vi } from 'vitest'
import { ResilientCredentialsStore } from '../src/store/resilientCredentialsStore.js'
import { InMemoryCredentialsStore } from '../src/store/credentialsStore.js'
import type { CredentialsStore } from '../src/store/credentialsStore.js'
import type { StoredNuvemshopCredentials } from '@thymos/nuvemshop-sdk'

const CREDS: StoredNuvemshopCredentials = {
  storeId: '123',
  accessToken: 'tok',
  connectedAt: new Date().toISOString(),
}

function brokenStore(): CredentialsStore {
  return {
    save: vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND fake.supabase.co')),
    load: vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND fake.supabase.co')),
    clear: vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND fake.supabase.co')),
  }
}

describe('ResilientCredentialsStore', () => {
  it('usa o principal normalmente quando ele funciona', async () => {
    const primary = new InMemoryCredentialsStore()
    const store = new ResilientCredentialsStore(primary)
    await store.save(CREDS)
    expect(await store.load()).toEqual(CREDS)
    expect(await primary.load()).toEqual(CREDS) // realmente foi parar no principal
  })

  it('cai para o fallback em memória quando save() do principal falha, sem lançar erro', async () => {
    const primary = brokenStore()
    const store = new ResilientCredentialsStore(primary)
    await expect(store.save(CREDS)).resolves.toBeUndefined()
    expect(await store.load()).toEqual(CREDS) // veio do fallback
  })

  it('cai para o fallback em memória quando load() do principal falha, sem lançar erro', async () => {
    const primary = brokenStore()
    const fallback = new InMemoryCredentialsStore()
    await fallback.save(CREDS)
    const store = new ResilientCredentialsStore(primary, fallback)
    await expect(store.load()).resolves.toEqual(CREDS)
  })

  it('clear() nunca lança, mesmo se o principal falhar', async () => {
    const primary = brokenStore()
    const fallback = new InMemoryCredentialsStore()
    await fallback.save(CREDS)
    const store = new ResilientCredentialsStore(primary, fallback)
    await expect(store.clear()).resolves.toBeUndefined()
    expect(await fallback.load()).toBeNull()
  })

  it('volta a usar o principal automaticamente assim que ele voltar a responder', async () => {
    const primary = new InMemoryCredentialsStore()
    const store = new ResilientCredentialsStore(primary)
    await store.save(CREDS)
    expect(await store.load()).toEqual(CREDS)
  })
})

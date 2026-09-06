import { describe, it, expect, vi } from 'vitest'
import { SupabaseCredentialsStore } from '../src/store/supabaseCredentialsStore.js'

const CREDS = {
  storeId: '7751289',
  accessToken: 'tok-123',
  scope: 'write_products',
  connectedAt: '2026-09-06T17:00:00.000Z',
}

describe('SupabaseCredentialsStore.save', () => {
  it('inclui on_conflict=chave na URL do upsert', async () => {
    // Regressão: sem esse parâmetro, o PostgREST não trata a requisição como
    // upsert — a primeira gravação de cada chave funciona (INSERT puro), mas
    // toda atualização seguinte falha com 409 "duplicate key value violates
    // unique constraint", silenciosamente engolida pelo ResilientCredentialsStore.
    // Isso deixava a credencial "presa" na primeira loja conectada, nunca
    // atualizada em reconexões futuras. Ver commit que corrigiu isso.
    const calls: string[] = []
    const fakeFetch = vi.fn(async (url: string) => {
      calls.push(url)
      return new Response(null, { status: 201 })
    }) as unknown as typeof fetch

    const store = new SupabaseCredentialsStore('https://example.supabase.co', 'service-role-key', fakeFetch)
    await store.save(CREDS)

    expect(calls.length).toBeGreaterThan(0)
    for (const url of calls) {
      expect(url).toContain('on_conflict=chave')
    }
  })

  it('propaga erro quando o Supabase responde com falha (ex.: 409 sem on_conflict)', async () => {
    const fakeFetch = vi.fn(async () => new Response(null, { status: 409 })) as unknown as typeof fetch
    const store = new SupabaseCredentialsStore('https://example.supabase.co', 'service-role-key', fakeFetch)
    await expect(store.save(CREDS)).rejects.toThrow(/409/)
  })
})

describe('SupabaseCredentialsStore.load', () => {
  it('retorna as credenciais quando as 3 chaves estão presentes', async () => {
    const rows = [
      { chave: 'nuvemshop_access_token', valor: CREDS.accessToken, atualizado_em: CREDS.connectedAt },
      { chave: 'nuvemshop_store_id', valor: CREDS.storeId },
      { chave: 'nuvemshop_scope', valor: CREDS.scope },
    ]
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify(rows), { status: 200 })) as unknown as typeof fetch
    const store = new SupabaseCredentialsStore('https://example.supabase.co', 'service-role-key', fakeFetch)
    const result = await store.load()
    expect(result).toEqual(CREDS)
  })

  it('retorna null quando faltam chaves obrigatórias', async () => {
    const fakeFetch = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })) as unknown as typeof fetch
    const store = new SupabaseCredentialsStore('https://example.supabase.co', 'service-role-key', fakeFetch)
    expect(await store.load()).toBeNull()
  })
})

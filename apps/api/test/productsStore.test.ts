import { describe, it, expect, vi } from 'vitest'
import { SupabaseProductsStore } from '../src/store/productsStore.js'

function fakeFetchWithRows(rows: unknown[]): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(rows), { status: 200 })) as unknown as typeof fetch
}

const BASE_ROW = {
  id: 1,
  nome_produto: 'T-Shirt Air Flow Neon',
  categoria: 'Camiseta Fitness',
  preco: 160,
  preco_promocional: null,
  estoque: 10,
  cores: null,
  descricao: 'desc',
  imagens: [],
}

describe('SupabaseProductsStore.listActive — normalização de tamanhos', () => {
  // Regressão: o campo `tamanhos` no Supabase acumulou valores fora do que a
  // loja realmente vende (PP, XG, 2XG, "Plus Size", "Único" misturados em
  // peças de roupa comuns) — visto em produção no produto "T-Shirt Air Flow
  // Neon", que chegava ao storefront com 9 tamanhos diferentes. Os únicos
  // tamanhos de roupa que existem de verdade são P, M, G e GG.
  it('filtra para só P, M, G, GG, na ordem canônica, descartando o resto', async () => {
    const row = { ...BASE_ROW, tamanhos: 'PP, P, M, XG, GG, Plus Size, G, Único, 2XG' }
    const store = new SupabaseProductsStore('https://x.supabase.co', 'key', fakeFetchWithRows([row]))
    const [product] = await store.listActive()
    expect(product.sizes).toEqual(['P', 'M', 'G', 'GG'])
  })

  it('mantém apenas os tamanhos de roupa realmente presentes (sem inventar os que faltam)', async () => {
    const row = { ...BASE_ROW, tamanhos: 'PP, P, M, G' }
    const store = new SupabaseProductsStore('https://x.supabase.co', 'key', fakeFetchWithRows([row]))
    const [product] = await store.listActive()
    expect(product.sizes).toEqual(['P', 'M', 'G'])
  })

  it('não mexe em listas sem nenhum tamanho de roupa (acessórios "Único", volumes em ml)', async () => {
    const rowUnico = { ...BASE_ROW, tamanhos: 'Único' }
    const rowMl = { ...BASE_ROW, tamanhos: '500ml, 750ml' }
    const store = new SupabaseProductsStore(
      'https://x.supabase.co',
      'key',
      fakeFetchWithRows([rowUnico, rowMl])
    )
    const [unico, ml] = await store.listActive()
    expect(unico.sizes).toEqual(['Único'])
    expect(ml.sizes).toEqual(['500ml', '750ml'])
  })

  it('sem coluna tamanhos preenchida, mantém lista vazia', async () => {
    const row = { ...BASE_ROW, tamanhos: null }
    const store = new SupabaseProductsStore('https://x.supabase.co', 'key', fakeFetchWithRows([row]))
    const [product] = await store.listActive()
    expect(product.sizes).toEqual([])
  })
})

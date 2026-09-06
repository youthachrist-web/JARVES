export interface Product {
  id: number
  name: string
  category: string
  price: number
  promotionalPrice: number | null
  stock: number
  sizes: string[]
  colors: string[]
  description: string
  images: string[]
}

export interface ProductsStore {
  listActive(): Promise<Product[]>
}

interface ProdutoRow {
  id: number
  nome_produto: string
  categoria: string | null
  preco: number
  preco_promocional: number | null
  estoque: number | null
  tamanhos: string | null
  cores: string | null
  descricao: string | null
  imagens: string[] | null
}

function splitList(value: string | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function normalize(row: ProdutoRow): Product {
  return {
    id: row.id,
    name: row.nome_produto,
    category: row.categoria ?? '',
    price: Number(row.preco),
    // 0 no banco significa "sem promoção" (não um preço promocional real de R$0)
    promotionalPrice: row.preco_promocional && Number(row.preco_promocional) > 0 ? Number(row.preco_promocional) : null,
    stock: row.estoque ?? 0,
    sizes: splitList(row.tamanhos),
    colors: splitList(row.cores),
    description: row.descricao ?? '',
    images: row.imagens ?? [],
  }
}

/**
 * Lê o catálogo real de produtos da tabela `produtos` no Supabase (já
 * existente e populada — ver FINAL_REPORT.md). Somente leitura: o cadastro
 * de produtos continua sendo feito diretamente no Supabase ou no painel
 * antigo; esta store só expõe os itens `status = 'Ativo'` publicamente para
 * a vitrine (apps/storefront).
 */
export class SupabaseProductsStore implements ProductsStore {
  constructor(
    private readonly supabaseUrl: string,
    private readonly serviceRoleKey: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private headers() {
    return { apikey: this.serviceRoleKey, Authorization: `Bearer ${this.serviceRoleKey}` }
  }

  async listActive(): Promise<Product[]> {
    const res = await this.fetchImpl(
      `${this.supabaseUrl}/rest/v1/produtos?select=id,nome_produto,categoria,preco,preco_promocional,estoque,tamanhos,cores,descricao,imagens&status=eq.Ativo&order=id.desc`,
      { headers: this.headers() }
    )
    if (!res.ok) throw new Error(`Falha ao carregar produtos do Supabase (status ${res.status})`)
    const rows = (await res.json()) as ProdutoRow[]
    return rows.map(normalize)
  }
}

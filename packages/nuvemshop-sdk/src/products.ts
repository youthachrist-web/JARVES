import type { NuvemshopClient } from './client.js'
import type { NuvemshopProduct } from './types.js'

/** Mapa de normalização de categoria (nome livre da Nuvemshop → categoria interna do catálogo). */
export const CATEGORY_MAP: Record<string, string> = {
  top: 'Top',
  tops: 'Top',
  legging: 'Legging',
  leggings: 'Legging',
  shorts: 'Shorts',
  conjunto: 'Conjunto',
  conjuntos: 'Conjunto',
  set: 'Conjunto',
  sutia: 'Sutiã Esportivo',
  'sutiã': 'Sutiã Esportivo',
  bra: 'Sutiã Esportivo',
  'top esportivo': 'Sutiã Esportivo',
  camiseta: 'Camiseta Fitness',
  camisetas: 'Camiseta Fitness',
  moletom: 'Moletom',
  moletons: 'Moletom',
  jaqueta: 'Jaqueta',
  jaquetas: 'Jaqueta',
  'acessórios': 'Acessórios',
  acessorio: 'Acessórios',
  accessories: 'Acessórios',
}

export function mapCategoryName(product: Pick<NuvemshopProduct, 'categories'>): string {
  const first = product.categories?.[0]
  const name = (first?.name?.pt || first?.name?.en || '').toLowerCase().trim()
  return CATEGORY_MAP[name] || 'Conjunto'
}

export interface NormalizedProduct {
  nuvemshopId: number
  name: string
  category: string
  price: number
  promotionalPrice: number | null
  stock: number | null
  sku: string | null
  description: string
  images: string[]
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

/** Converte um produto no formato da Nuvemshop para o formato interno usado pelo catálogo/painel. */
export function normalizeProduct(product: NuvemshopProduct): NormalizedProduct {
  const variant = product.variants?.[0]
  const images = (product.images ?? []).map((img) => img.src).filter(Boolean)
  const description = product.description?.pt || product.description?.en || ''

  return {
    nuvemshopId: product.id,
    name: product.name?.pt || product.name?.en || `Produto ${product.id}`,
    category: mapCategoryName(product),
    price: variant?.price ? parseFloat(variant.price) : 0,
    promotionalPrice: variant?.promotional_price ? parseFloat(variant.promotional_price) : null,
    stock: variant?.stock != null ? Number(variant.stock) : null,
    sku: variant?.sku ?? null,
    description: stripHtml(description),
    images,
  }
}

export class ProductsResource {
  constructor(private client: NuvemshopClient) {}

  list(query?: { page?: number; per_page?: number; fields?: string }) {
    return this.client.get<NuvemshopProduct[]>('/products', query)
  }

  listAll() {
    return this.client.listAll<NuvemshopProduct>('/products', {
      fields: 'id,name,categories,variants,images,description,published',
    })
  }

  get(id: number | string) {
    return this.client.get<NuvemshopProduct>(`/products/${id}`)
  }

  create(payload: Record<string, unknown>) {
    return this.client.post<NuvemshopProduct>('/products', payload)
  }

  update(id: number | string, payload: Record<string, unknown>) {
    return this.client.put<NuvemshopProduct>(`/products/${id}`, payload)
  }

  delete(id: number | string) {
    return this.client.delete(`/products/${id}`)
  }

  addImage(id: number | string, src: string) {
    return this.client.post(`/products/${id}/images`, { src })
  }
}

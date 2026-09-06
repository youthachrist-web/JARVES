import { describe, it, expect } from 'vitest'
import { mapCategoryName, normalizeProduct } from '../src/products.js'
import type { NuvemshopProduct } from '../src/types.js'

describe('mapCategoryName', () => {
  it('mapeia categorias conhecidas (case-insensitive)', () => {
    expect(mapCategoryName({ categories: [{ id: 1, name: { pt: 'Leggings' } }] })).toBe('Legging')
    expect(mapCategoryName({ categories: [{ id: 1, name: { pt: 'TOP ESPORTIVO' } }] })).toBe('Sutiã Esportivo')
  })

  it('usa fallback "Conjunto" para produto sem categoria (dado incompleto)', () => {
    expect(mapCategoryName({ categories: [] })).toBe('Conjunto')
    expect(mapCategoryName({})).toBe('Conjunto')
  })

  it('usa fallback para categoria desconhecida', () => {
    expect(mapCategoryName({ categories: [{ id: 1, name: { pt: 'Categoria Nova Nunca Vista' } }] })).toBe('Conjunto')
  })
})

describe('normalizeProduct', () => {
  const base: NuvemshopProduct = {
    id: 42,
    name: { pt: 'Legging Sculpt' },
    description: { pt: '<p>Tecido <b>premium</b></p>' },
    categories: [{ id: 1, name: { pt: 'Legging' } }],
    images: [{ id: 1, src: 'https://cdn/img1.jpg' }, { id: 2, src: 'https://cdn/img2.jpg' }],
    variants: [{ price: '249.90', promotional_price: '199.90', stock: 12, sku: 'LEG-001' }],
  }

  it('normaliza um produto completo corretamente', () => {
    const result = normalizeProduct(base)
    expect(result).toEqual({
      nuvemshopId: 42,
      name: 'Legging Sculpt',
      category: 'Legging',
      price: 249.9,
      promotionalPrice: 199.9,
      stock: 12,
      sku: 'LEG-001',
      description: 'Tecido premium',
      images: ['https://cdn/img1.jpg', 'https://cdn/img2.jpg'],
    })
  })

  it('lida com produto sem variantes (dado parcial/incompleto da API)', () => {
    const result = normalizeProduct({ id: 1, name: { pt: 'Sem variante' } })
    expect(result.price).toBe(0)
    expect(result.stock).toBeNull()
    expect(result.promotionalPrice).toBeNull()
  })

  it('usa nome em inglês como fallback quando não há pt', () => {
    const result = normalizeProduct({ id: 1, name: { en: 'English Name' } })
    expect(result.name).toBe('English Name')
  })

  it('usa "Produto {id}" quando não há nome em nenhum idioma', () => {
    const result = normalizeProduct({ id: 77, name: {} })
    expect(result.name).toBe('Produto 77')
  })
})

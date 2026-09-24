import { Router } from 'express'
import type { ProductsStore, Product } from '../store/productsStore.js'
import type { MelhorEnvioClient, ShippingPackage } from '../lib/melhorEnvio.js'
import { isValidRequestedItem, type RequestedItem } from '../lib/orderItems.js'
import { logger } from '../logger.js'

export interface ShippingRouterDeps {
  productsStore: ProductsStore | null
  melhorEnvioClient: MelhorEnvioClient | null
  storeOriginCep: string | null
  freeShippingThreshold: number
  defaultPackage: { widthCm: number; heightCm: number; lengthCm: number; weightKg: number }
}

function normalizeCep(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const digits = raw.replace(/\D/g, '')
  return digits.length === 8 ? digits : null
}

/**
 * Resolve os itens pedidos contra o catálogo real (preço/existência —
 * nunca confia no que o cliente mandou) e monta os "pacotes" pra cotação —
 * ver melhorEnvioDefaultPackage em config.ts sobre por que usamos dimensões
 * padrão por item em vez de peso/dimensões reais por SKU.
 */
export function resolveShippingPackages(
  requested: RequestedItem[],
  products: Product[],
  defaultPackage: ShippingRouterDeps['defaultPackage']
): { packages: ShippingPackage[]; subtotal: number } | { error: string } {
  const byId = new Map(products.map((p) => [p.id, p]))
  const packages: ShippingPackage[] = []
  let subtotal = 0
  for (const { productId, qty } of requested) {
    const product = byId.get(productId)
    if (!product) return { error: `Produto #${productId} não encontrado ou indisponível.` }
    const unitPrice = product.promotionalPrice ?? product.price
    subtotal += unitPrice * qty
    packages.push({
      id: product.name,
      width: defaultPackage.widthCm,
      height: defaultPackage.heightCm,
      length: defaultPackage.lengthCm,
      weight: defaultPackage.weightKg,
      insurance_value: unitPrice,
      quantity: qty,
    })
  }
  return { packages, subtotal }
}

/**
 * Cotação de frete pro checkout do storefront. Pública (sem chave de
 * admin) e com CORS liberado pra qualquer origem, mesmo padrão de
 * routes/shop.ts#/products e #/orders: o storefront estático muda de
 * domínio (GitHub Pages, CDN, domínio próprio) e essa rota não expõe nada
 * sensível — só devolve preço/prazo de transportadoras pra um CEP.
 */
export function shippingRouter({ productsStore, melhorEnvioClient, storeOriginCep, freeShippingThreshold, defaultPackage }: ShippingRouterDeps): Router {
  const router = Router()

  function allowAnyOrigin(res: import('express').Response) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }

  router.options('/shipping/quote', (_req, res) => {
    allowAnyOrigin(res)
    res.status(204).end()
  })

  router.post('/shipping/quote', async (req, res) => {
    allowAnyOrigin(res)

    if (!productsStore) {
      res.status(503).json({ error: 'Catálogo indisponível — Supabase não configurado' })
      return
    }
    if (!melhorEnvioClient || !storeOriginCep) {
      res.status(503).json({ error: 'Cotação de frete indisponível no momento.' })
      return
    }

    const { cep, items } = req.body ?? {}
    const destinationCep = normalizeCep(cep)
    if (!destinationCep) {
      res.status(400).json({ error: 'CEP inválido — envie 8 dígitos.' })
      return
    }
    if (!Array.isArray(items) || items.length === 0 || !items.every(isValidRequestedItem)) {
      res.status(400).json({ error: 'items deve ser uma lista não vazia de { productId, qty }.' })
      return
    }

    let products: Product[]
    try {
      products = await productsStore.listActive()
    } catch (err) {
      logger.error('Falha ao carregar catálogo para cotar frete', { message: (err as Error).message })
      res.status(503).json({ error: 'Não foi possível cotar o frete agora. Tente novamente em instantes.' })
      return
    }

    const resolved = resolveShippingPackages(items, products, defaultPackage)
    if ('error' in resolved) {
      res.status(400).json({ error: resolved.error })
      return
    }

    if (resolved.subtotal >= freeShippingThreshold) {
      // Acima do limite de frete grátis: nem precisa consultar a Melhor
      // Envio — a transportadora de fato usada é escolhida pela loja na
      // hora de despachar, não pelo cliente no checkout.
      res.json({ free: true, options: [] })
      return
    }

    try {
      const options = await melhorEnvioClient.calculate({
        originCep: storeOriginCep,
        destinationCep,
        packages: resolved.packages,
      })
      res.json({ free: false, options })
    } catch (err) {
      logger.error('Falha ao cotar frete na Melhor Envio', { message: (err as Error).message })
      res.status(503).json({ error: 'Não foi possível cotar o frete agora. Tente novamente em instantes.' })
    }
  })

  return router
}

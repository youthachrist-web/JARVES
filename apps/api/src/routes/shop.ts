import { Router } from 'express'
import type { ProductsStore, Product } from '../store/productsStore.js'
import type { OrdersStore, OrderItem } from '../store/ordersStore.js'
import type { EventLogStore } from '../store/eventLogStore.js'
import type { Mailer } from '../lib/mailer.js'
import type { AbacatePayClient } from '../lib/abacatepay.js'
import type { MelhorEnvioClient } from '../lib/melhorEnvio.js'
import { isValidRequestedItem, type RequestedItem } from '../lib/orderItems.js'
import { resolveShippingPackages } from './shipping.js'
import { logger } from '../logger.js'

export interface ShopRouterDeps {
  productsStore: ProductsStore | null
  ordersStore: OrdersStore | null
  eventLog: EventLogStore
  mailer: Mailer
  /** null quando ABACATEPAY_API_KEY não está configurada — o pedido ainda é
   * capturado normalmente, só sem link de pagamento automático (ver
   * lib/abacatepay.ts). */
  abacatePayClient: AbacatePayClient | null
  /** Usada só no fluxo de cartão (link hospedado, ver createPaymentLink em
   * lib/abacatepay.ts) como returnUrl/completionUrl — o Pix transparente não
   * redireciona, não precisa disso. */
  storefrontUrl: string | null
  /** ABACATEPAY_CARD_ENABLED — ver config.ts. Desligado até a AbacatePay
   * homologar cartão para a conta; enquanto isso GET /payment-methods
   * anuncia `card: false` e POST /orders recusa `paymentMethod: "card"`. */
  cardEnabled: boolean
  /** null quando MELHOR_ENVIO_TOKEN não está configurada — ver
   * routes/shipping.ts. Abaixo do limite de frete grátis, POST /orders
   * exige frete calculado (não deixa o pedido passar sem cobrar frete). */
  melhorEnvioClient: MelhorEnvioClient | null
  storeOriginCep: string | null
  freeShippingThreshold: number
  melhorEnvioDefaultPackage: { widthCm: number; heightCm: number; lengthCm: number; weightKg: number }
}

/**
 * Cupões válidos e seu desconto (fração de 0 a 1). Fonte de verdade do
 * servidor — precisa ficar em sincronia com DISCOUNT_CODE em
 * apps/storefront/script.js, que é só o que decide MOSTRAR o cupão ao
 * cliente. O desconto que efetivamente vale é sempre recalculado aqui: um
 * couponCode enviado pelo cliente nunca é suficiente, é só um pedido de
 * validação — o servidor decide o total real.
 */
const COUPONS: Record<string, number> = {
  THYMOS10: 0.1,
}

/**
 * Validação de CPF (dígito verificador) — mesmo algoritmo replicado no
 * storefront (ver isValidCPF em script.js) para feedback imediato, mas
 * quem decide de verdade é sempre aqui: um CPF nunca é confiável só porque
 * "passou" no cliente. Exigido porque a AbacatePay recusa a cobrança Pix
 * inteira quando manda `customer` sem `taxId` válido (ver lib/abacatepay.ts).
 */
function isValidCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, '')
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digits = cpf.split('').map(Number)
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += digits[i] * (len + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return calc(9) === digits[9] && calc(10) === digits[10]
}

/**
 * Catálogo público de produtos e captura de pedidos, servindo o storefront
 * (apps/storefront) diretamente do Supabase — sem depender da Nuvemshop
 * estar conectada. Rotas públicas de propósito (sem chave de admin): o
 * catálogo é informação pública da vitrine, e o pedido é o próprio fluxo de
 * checkout do cliente final.
 *
 * CORS liberado para qualquer origem nestas duas rotas especificamente
 * (independente de CORS_ALLOWED_ORIGINS): o storefront estático é publicado
 * em domínios que mudam (GitHub Pages, CDN, domínio próprio futuro) e não
 * há dado sensível sendo exposto aqui (catálogo público + intake de pedido,
 * sem autenticação de admin envolvida de qualquer forma).
 */
export function shopRouter({
  productsStore,
  ordersStore,
  eventLog,
  mailer,
  abacatePayClient,
  storefrontUrl,
  cardEnabled,
  melhorEnvioClient,
  storeOriginCep,
  freeShippingThreshold,
  melhorEnvioDefaultPackage,
}: ShopRouterDeps): Router {
  const router = Router()

  function allowAnyOrigin(res: import('express').Response) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }

  router.options('/products', (_req, res) => {
    allowAnyOrigin(res)
    res.status(204).end()
  })

  router.get('/products', async (_req, res) => {
    allowAnyOrigin(res)
    if (!productsStore) {
      res.status(503).json({ error: 'Catálogo indisponível — Supabase não configurado' })
      return
    }
    try {
      const products = await productsStore.listActive()
      res.json({ products })
    } catch (err) {
      logger.error('Falha ao listar produtos', { message: (err as Error).message })
      res.status(503).json({ error: 'Não foi possível carregar o catálogo agora. Tente novamente em instantes.' })
    }
  })

  // Pro storefront saber, sem chumbar no código, se a aba "Cartão de
  // Crédito" do checkout deve aparecer habilitada — ver ABACATEPAY_CARD_ENABLED
  // em config.ts. Pix nunca depende disso.
  router.options('/payment-methods', (_req, res) => {
    allowAnyOrigin(res)
    res.status(204).end()
  })
  router.get('/payment-methods', (_req, res) => {
    allowAnyOrigin(res)
    res.json({ pix: !!abacatePayClient, card: cardEnabled && !!abacatePayClient })
  })

  router.options('/orders', (_req, res) => {
    allowAnyOrigin(res)
    res.status(204).end()
  })

  router.post('/orders', async (req, res) => {
    allowAnyOrigin(res)
    if (!ordersStore || !productsStore) {
      res.status(503).json({ error: 'Checkout indisponível — Supabase não configurado' })
      return
    }

    const { customerName, customerEmail, customerPhone, customerTaxId, items, couponCode, paymentMethod, shippingCep, shippingServiceId } = req.body ?? {}

    if (!customerName || !customerEmail || !customerTaxId || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Campos obrigatórios: customerName, customerEmail, customerTaxId (CPF), items (lista não vazia).' })
      return
    }
    if (typeof customerTaxId !== 'string' || !isValidCPF(customerTaxId)) {
      res.status(400).json({ error: 'CPF inválido.' })
      return
    }
    const normalizedTaxId = customerTaxId.replace(/\D/g, '')
    if (paymentMethod !== undefined && paymentMethod !== 'pix' && paymentMethod !== 'card') {
      res.status(400).json({ error: 'paymentMethod deve ser "pix" ou "card".' })
      return
    }
    const wantsCard = paymentMethod === 'card'
    if (wantsCard && !(cardEnabled && abacatePayClient)) {
      res.status(400).json({ error: 'Pagamento por cartão de crédito não está disponível no momento — use Pix.' })
      return
    }
    if (!items.every(isValidRequestedItem)) {
      res.status(400).json({ error: 'Cada item precisa de productId (número) e qty (inteiro positivo).' })
      return
    }
    const requested: RequestedItem[] = items

    // Preço e nome SEMPRE vêm do catálogo real — o que o cliente manda para
    // esses campos é ignorado. É a única forma de garantir "preço exato" e
    // evitar que alguém manipule o valor antes de gerar o link de pagamento.
    let products: Product[]
    try {
      products = await productsStore.listActive()
    } catch (err) {
      logger.error('Falha ao carregar catálogo para validar pedido', { message: (err as Error).message })
      res.status(503).json({ error: 'Não foi possível validar o pedido agora. Tente novamente em instantes.' })
      return
    }
    const byId = new Map(products.map((p) => [p.id, p]))

    const resolvedItems: OrderItem[] = []
    for (const { productId, qty } of requested) {
      const product = byId.get(productId)
      if (!product) {
        res.status(400).json({ error: `Produto #${productId} não encontrado ou indisponível.` })
        return
      }
      if (qty > product.stock) {
        res.status(409).json({ error: `Estoque insuficiente para "${product.name}" — disponível: ${product.stock}.` })
        return
      }
      const unitPrice = product.promotionalPrice ?? product.price
      resolvedItems.push({ productId, name: product.name, price: unitPrice, qty })
    }

    const subtotal = resolvedItems.reduce((s, i) => s + i.price * i.qty, 0)
    const normalizedCoupon = typeof couponCode === 'string' ? couponCode.trim().toUpperCase() : ''
    const discountRate = COUPONS[normalizedCoupon] ?? 0
    const appliedCoupon = discountRate > 0 ? normalizedCoupon : null
    const discount = Math.round(subtotal * discountRate)
    const subtotalAfterDiscount = subtotal - discount

    // Frete: nunca confia no preço que o cliente manda (se mandasse). O
    // cliente só escolhe QUAL transportadora (shippingServiceId, devolvido
    // por GET /shipping/quote) — o preço real é sempre recotado aqui na hora
    // de fechar o pedido, igual ao cupom acima. Abaixo do limite de frete
    // grátis, frete é obrigatório: sem ele o pedido nem chega a ser
    // registrado, pra nunca cobrar um total sem frete por engano.
    let shippingCost = 0
    let shippingLabel: string | null = null
    let shippingCepNormalized: string | null = null
    if (subtotalAfterDiscount < freeShippingThreshold) {
      const destinationCep = typeof shippingCep === 'string' ? shippingCep.replace(/\D/g, '') : ''
      const serviceId = Number(shippingServiceId)
      if (destinationCep.length !== 8 || !Number.isInteger(serviceId)) {
        res.status(400).json({ error: 'Frete obrigatório para pedidos abaixo do frete grátis — informe shippingCep e shippingServiceId (ver GET /shipping/quote).' })
        return
      }
      if (!melhorEnvioClient || !storeOriginCep) {
        res.status(503).json({ error: 'Frete indisponível no momento — não foi possível fechar o pedido.' })
        return
      }
      const resolvedPackages = resolveShippingPackages(requested, products, melhorEnvioDefaultPackage)
      if ('error' in resolvedPackages) {
        res.status(400).json({ error: resolvedPackages.error })
        return
      }
      try {
        const options = await melhorEnvioClient.calculate({ originCep: storeOriginCep, destinationCep, packages: resolvedPackages.packages })
        const chosen = options.find((o) => o.id === serviceId)
        if (!chosen) {
          res.status(400).json({ error: 'Opção de frete inválida ou expirada — recalcule o frete e tente de novo.' })
          return
        }
        shippingCost = chosen.price
        shippingLabel = `${chosen.company} ${chosen.name}`
        shippingCepNormalized = destinationCep
      } catch (err) {
        logger.error('Falha ao recalcular frete no fechamento do pedido', { message: (err as Error).message })
        res.status(503).json({ error: 'Não foi possível confirmar o frete agora. Tente novamente em instantes.' })
        return
      }
    }

    const total = subtotalAfterDiscount + shippingCost

    let orderId: number
    try {
      const created = await ordersStore.create({
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        customerTaxId: normalizedTaxId,
        items: resolvedItems,
        subtotal,
        discount,
        total,
        couponCode: appliedCoupon,
        shippingCost,
        shippingLabel,
        shippingCep: shippingCepNormalized,
      })
      orderId = created.id
    } catch (err) {
      logger.error('Falha ao registrar pedido', { message: (err as Error).message })
      await eventLog.record({ level: 'error', category: 'order', message: 'Falha ao registrar pedido', detail: { error: (err as Error).message } })
      res.status(503).json({ error: 'Não foi possível registrar o pedido agora. Tente novamente em instantes.' })
      return
    }

    await eventLog.record({
      level: 'info',
      category: 'order',
      message: `Novo pedido recebido pelo storefront: #${orderId}`,
      detail: { id: orderId, customerEmail, subtotal, discount, shippingCost, shippingLabel, total, couponCode: appliedCoupon },
    })

    // Geração do pagamento: melhor esforço — uma falha aqui NUNCA deve fazer
    // o pedido inteiro falhar, já que ele já foi capturado com sucesso acima.
    // Sem ABACATEPAY_API_KEY configurada, abacatePayClient é null e o pedido
    // segue sem cobrança automática. Pix (padrão) fica transparente — QR
    // Code/copia-e-cola nunca são persistidos, só o checkoutId (pro webhook
    // casar o pagamento, ver routes/webhooks.ts). Cartão (wantsCard, só
    // possível quando cardEnabled — ver ABACATEPAY_CARD_ENABLED em
    // config.ts) usa o link hospedado da AbacatePay: sai do site, mas é o
    // único jeito de aceitar cartão até a AbacatePay liberar o método
    // transparente pra esta conta.
    //
    // `customer` (com `taxId`) sempre é enviado no Pix: a AbacatePay recusa
    // a cobrança inteira ("Value should be one of 'object', 'object'")
    // quando esse objeto vem sem CPF válido, ou com `cellphone` ausente
    // (mesmo que `undefined` em vez de string vazia) — visto em produção.
    let pix: { checkoutId: string; brCode: string; brCodeBase64: string; expiresAt: string } | null = null
    let paymentUrl: string | null = null
    if (abacatePayClient && total > 0) {
      try {
        if (wantsCard) {
          const totalQty = resolvedItems.reduce((s, i) => s + i.qty, 0)
          const link = await abacatePayClient.createPaymentLink({
            name: `Pedido Thymos #${orderId} (${totalQty} ${totalQty === 1 ? 'item' : 'itens'})`,
            priceCents: Math.round(total * 100),
            externalId: `pedido-${orderId}`,
            returnUrl: storefrontUrl ?? undefined,
            completionUrl: storefrontUrl ?? undefined,
          })
          await ordersStore.attachPayment(orderId, { provider: 'abacatepay', checkoutId: link.checkoutId, url: link.url, status: link.status })
          paymentUrl = link.url
        } else {
          const charge = await abacatePayClient.createPixCharge({
            amountCents: Math.round(total * 100),
            description: `Pedido Thymos #${orderId}`,
            externalId: `pedido-${orderId}`,
            expiresIn: 1800, // 30 minutos
            customer: { name: customerName, email: customerEmail, cellphone: customerPhone || '', taxId: normalizedTaxId },
          })
          await ordersStore.attachPayment(orderId, { provider: 'abacatepay', checkoutId: charge.checkoutId, url: null, status: charge.status })
          pix = { checkoutId: charge.checkoutId, brCode: charge.brCode, brCodeBase64: charge.brCodeBase64, expiresAt: charge.expiresAt }
        }
      } catch (err) {
        logger.error(`Falha ao gerar ${wantsCard ? 'link de pagamento (cartão)' : 'cobrança Pix'} AbacatePay`, { orderId, message: (err as Error).message })
        await eventLog.record({
          level: 'error',
          category: 'payment',
          message: `Falha ao gerar pagamento (${wantsCard ? 'cartão' : 'pix'}) para o pedido #${orderId}`,
          detail: { orderId, error: (err as Error).message },
        })
      }
    }

    res.status(201).json({ success: true, orderId, subtotal, discount, shippingCost, shippingLabel, total, couponApplied: appliedCoupon, pix, paymentUrl })

    // E-mail de notificação: melhor esforço, disparado depois da resposta ao
    // cliente e nunca aguardado por ela — um SMTP lento ou fora do ar (visto
    // em produção: timeout de conexão de ~2min) não pode travar o checkout
    // nem, sem o catch, derrubar o processo inteiro por unhandled rejection.
    mailer
      .send(
        `Novo pedido — #${orderId}`,
        `Cliente: ${customerName} (${customerEmail}${customerPhone ? `, ${customerPhone}` : ''})\n` +
          `Subtotal: R$ ${subtotal.toLocaleString('pt-BR')}${appliedCoupon ? `\nCupão: ${appliedCoupon} (-R$ ${discount.toLocaleString('pt-BR')})` : ''}\n` +
          (shippingLabel ? `Frete: ${shippingLabel} — R$ ${shippingCost.toLocaleString('pt-BR')} (CEP ${shippingCep})\n` : 'Frete: grátis\n') +
          `Total: R$ ${total.toLocaleString('pt-BR')}\n` +
          (pix ? `Cobrança Pix gerada (checkout ${pix.checkoutId})\n` : '') +
          (paymentUrl ? `Link de pagamento (cartão): ${paymentUrl}\n` : '') +
          `\nItens:\n${resolvedItems.map((i) => `- ${i.qty}x ${i.name} — R$ ${i.price.toLocaleString('pt-BR')}`).join('\n')}`
      )
      .catch((err) => {
        logger.error('Falha ao enviar e-mail de notificação do pedido', { orderId, message: (err as Error).message })
        void eventLog.record({
          level: 'error',
          category: 'order',
          message: `Falha ao enviar e-mail de notificação do pedido #${orderId}`,
          detail: { orderId, error: (err as Error).message },
        })
      })
  })

  router.options('/orders/:id/status', (_req, res) => {
    allowAnyOrigin(res)
    res.status(204).end()
  })

  // Poll leve pro storefront saber quando o Pix foi confirmado, sem precisar
  // consultar a AbacatePay de novo — o webhook (routes/webhooks.ts) já
  // atualiza pagamento_status no Supabase assim que o pagamento é
  // confirmado; aqui só lemos esse valor. Sem dado sensível na resposta.
  router.get('/orders/:id/status', async (req, res) => {
    allowAnyOrigin(res)
    if (!ordersStore) {
      res.status(503).json({ error: 'Checkout indisponível — Supabase não configurado' })
      return
    }
    const orderId = Number(req.params.id)
    if (!Number.isInteger(orderId) || orderId <= 0) {
      res.status(400).json({ error: 'Id de pedido inválido' })
      return
    }
    try {
      const status = await ordersStore.getStatus(orderId)
      if (status === null) {
        res.status(404).json({ error: 'Pedido não encontrado' })
        return
      }
      res.json({ status })
    } catch (err) {
      logger.error('Falha ao consultar status do pedido', { orderId, message: (err as Error).message })
      res.status(503).json({ error: 'Não foi possível consultar o status agora. Tente novamente em instantes.' })
    }
  })

  return router
}

import { Router } from 'express'
import type { ProductsStore, Product } from '../store/productsStore.js'
import type { OrdersStore, OrderItem } from '../store/ordersStore.js'
import type { EventLogStore } from '../store/eventLogStore.js'
import type { Mailer } from '../lib/mailer.js'
import type { AbacatePayClient } from '../lib/abacatepay.js'
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
  /** Não usada pelo checkout Pix transparente atual (não há redirecionamento
   * nem returnUrl/completionUrl); mantida na config só para o dia em que o
   * link hospedado (createPaymentLink, ver lib/abacatepay.ts) for reativado
   * — ex.: quando cartão for liberado na conta AbacatePay. */
  storefrontUrl: string | null
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

interface RequestedItem {
  productId: number
  qty: number
}

function isValidRequestedItem(x: unknown): x is RequestedItem {
  return !!x && typeof x === 'object' && typeof (x as RequestedItem).productId === 'number' && Number.isInteger((x as RequestedItem).qty) && (x as RequestedItem).qty > 0
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
export function shopRouter({ productsStore, ordersStore, eventLog, mailer, abacatePayClient }: ShopRouterDeps): Router {
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

    const { customerName, customerEmail, customerPhone, customerTaxId, items, couponCode } = req.body ?? {}

    if (!customerName || !customerEmail || !customerTaxId || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Campos obrigatórios: customerName, customerEmail, customerTaxId (CPF), items (lista não vazia).' })
      return
    }
    if (typeof customerTaxId !== 'string' || !isValidCPF(customerTaxId)) {
      res.status(400).json({ error: 'CPF inválido.' })
      return
    }
    const normalizedTaxId = customerTaxId.replace(/\D/g, '')
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
    const total = subtotal - discount

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
      detail: { id: orderId, customerEmail, subtotal, discount, total, couponCode: appliedCoupon },
    })

    // Checkout Pix transparente: melhor esforço — uma falha aqui NUNCA deve
    // fazer o pedido inteiro falhar, já que ele já foi capturado com sucesso
    // acima. Sem ABACATEPAY_API_KEY configurada, abacatePayClient é null e o
    // pedido segue exatamente como antes desta integração (sem Pix
    // automático). QR Code/copia-e-cola nunca são persistidos — só vivem
    // nesta resposta; o que persiste é o checkoutId (pro webhook casar o
    // pagamento confirmado, ver routes/webhooks.ts).
    //
    // `customer` (com `taxId`) agora é sempre enviado: a AbacatePay recusa a
    // cobrança inteira ("Value should be one of 'object', 'object'") quando
    // esse objeto vem sem CPF válido (visto em produção) — por isso o
    // checkout passou a exigir CPF (validado acima), o que também associa o
    // nome do cliente ao Pix gerado.
    let pix: { checkoutId: string; brCode: string; brCodeBase64: string; expiresAt: string } | null = null
    if (abacatePayClient && total > 0) {
      try {
        const charge = await abacatePayClient.createPixCharge({
          amountCents: Math.round(total * 100),
          description: `Pedido Thymos #${orderId}`,
          externalId: `pedido-${orderId}`,
          expiresIn: 1800, // 30 minutos
          // `cellphone` sempre como string (mesmo vazia) — testado em
          // produção: a AbacatePay recusa a cobrança inteira ("Value should
          // be one of 'object', 'object'") quando esse campo vem `undefined`
          // ou `null`, apesar de documentado como opcional. Uma string vazia
          // funciona normalmente.
          customer: { name: customerName, email: customerEmail, cellphone: customerPhone || '', taxId: normalizedTaxId },
        })
        await ordersStore.attachPayment(orderId, { provider: 'abacatepay', checkoutId: charge.checkoutId, url: null, status: charge.status })
        pix = { checkoutId: charge.checkoutId, brCode: charge.brCode, brCodeBase64: charge.brCodeBase64, expiresAt: charge.expiresAt }
      } catch (err) {
        logger.error('Falha ao gerar cobrança Pix AbacatePay', { orderId, message: (err as Error).message })
        await eventLog.record({
          level: 'error',
          category: 'payment',
          message: `Falha ao gerar cobrança Pix para o pedido #${orderId}`,
          detail: { orderId, error: (err as Error).message },
        })
      }
    }

    res.status(201).json({ success: true, orderId, subtotal, discount, total, couponApplied: appliedCoupon, pix })

    // E-mail de notificação: melhor esforço, disparado depois da resposta ao
    // cliente e nunca aguardado por ela — um SMTP lento ou fora do ar (visto
    // em produção: timeout de conexão de ~2min) não pode travar o checkout
    // nem, sem o catch, derrubar o processo inteiro por unhandled rejection.
    mailer
      .send(
        `Novo pedido — #${orderId}`,
        `Cliente: ${customerName} (${customerEmail}${customerPhone ? `, ${customerPhone}` : ''})\n` +
          `Subtotal: R$ ${subtotal.toLocaleString('pt-BR')}${appliedCoupon ? `\nCupão: ${appliedCoupon} (-R$ ${discount.toLocaleString('pt-BR')})` : ''}\n` +
          `Total: R$ ${total.toLocaleString('pt-BR')}\n` +
          (pix ? `Cobrança Pix gerada (checkout ${pix.checkoutId})\n` : '') +
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

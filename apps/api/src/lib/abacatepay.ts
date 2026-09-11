import { logger } from '../logger.js'

const BASE_URL = 'https://api.abacatepay.com/v2'

export interface CreatePaymentLinkParams {
  /** Nome exibido na tela de pagamento — ex.: "Pedido Thymos #123 (3 itens)". */
  name: string
  /** Valor total já com desconto aplicado, em centavos (a AbacatePay trabalha em centavos). */
  priceCents: number
  /** Referência interna nossa (id do pedido) — vem de volta no webhook em `data.externalId`. */
  externalId: string
  /** Para onde mandar o cliente se ele clicar em "Voltar" na tela de pagamento. */
  returnUrl?: string
  /** Para onde mandar o cliente depois que o pagamento for concluído. */
  completionUrl?: string
}

export interface PaymentLink {
  /** Id do checkout na AbacatePay — usado para casar o webhook de confirmação com o pedido. */
  checkoutId: string
  /** URL de pagamento real — para onde o cliente é levado para pagar (Pix, cartão...). */
  url: string
  status: string
}

export interface CreatePixChargeParams {
  /** Valor total já com desconto aplicado, em centavos. */
  amountCents: number
  /** Aparece no app do banco do cliente ao pagar. */
  description: string
  /** Referência interna nossa (id do pedido) — vem de volta no webhook em `data.externalId`. */
  externalId: string
  /** Segundos até o QR Code expirar. */
  expiresIn: number
  customer?: { name?: string; email?: string; cellphone?: string }
}

export interface PixCharge {
  /** Id da cobrança na AbacatePay — usado para casar o webhook de confirmação com o pedido. */
  checkoutId: string
  /** QR Code já como data URI (data:image/png;base64,...) — pronto pra um <img src>. */
  brCodeBase64: string
  /** Código "copia e cola" — alternativa ao QR Code (ex.: pra colar no app do banco). */
  brCode: string
  /** ISO datetime de expiração do QR Code. */
  expiresAt: string
  status: string
}

export interface AbacatePayClient {
  /**
   * Cria o link de pagamento para um pedido. A AbacatePay exige que todo item
   * de checkout referencie um "produto" já cadastrado na própria AbacatePay
   * (não aceita preço/nome soltos na hora do checkout) — por isso, em vez de
   * sincronizar o catálogo inteiro do Supabase como produtos permanentes lá
   * (o que exigiria manter preço/estoque em dois lugares), criamos um produto
   * avulso por pedido representando o total já calculado (com cupom aplicado
   * quando houver), e um checkout de item único apontando para ele. Cada
   * pedido = 1 produto avulso + 1 checkout, ambos rastreáveis pelo
   * `externalId` que é o id do nosso próprio pedido.
   *
   * Mantido para o método hospedado (redireciona pra app.abacatepay.com) —
   * hoje o checkout do storefront usa createPixCharge() abaixo, que fica no
   * próprio site. Fica disponível pra quando cartão for liberado na conta
   * (checkout transparente só cobre Pix/Boleto, cartão exige o link).
   */
  createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLink>
  /**
   * Cria uma cobrança Pix "transparente": ao contrário do link acima, não
   * exige produto pré-cadastrado nem redireciona o cliente — a resposta já
   * traz o QR Code (imagem) e o código copia-e-cola pra exibir na própria
   * página do storefront, mantendo a marca da loja do início ao fim.
   */
  createPixCharge(params: CreatePixChargeParams): Promise<PixCharge>
}

interface AbacateApiEnvelope<T> {
  data: T | null
  success: boolean
  error: string | null
}

async function abacateFetch<T>(apiKey: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as AbacateApiEnvelope<T> | null
  if (!res.ok || !json || !json.success || !json.data) {
    const detail = json?.error || `HTTP ${res.status}`
    throw new Error(`AbacatePay: falha em ${path} — ${detail}`)
  }
  return json.data
}

class RealAbacatePayClient implements AbacatePayClient {
  constructor(private readonly apiKey: string) {}

  async createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLink> {
    // 1) Produto avulso com o total exato do pedido (já com cupom aplicado).
    const product = await abacateFetch<{ id: string }>(this.apiKey, '/products/create', {
      externalId: params.externalId,
      name: params.name.slice(0, 120),
      price: params.priceCents,
      currency: 'BRL',
    })

    // 2) Checkout de item único apontando para o produto recém-criado.
    // Só PIX: CARD exige homologação extra da AbacatePay para a loja (nem
    // toda conta tem liberado) e pedir um método indisponível derruba a
    // criação do checkout inteiro — visto em produção ("CARD is not
    // available for this store"). PIX é o método padrão, sempre disponível.
    const checkout = await abacateFetch<{ id: string; url: string; status: string }>(this.apiKey, '/checkouts/create', {
      items: [{ id: product.id, quantity: 1 }],
      externalId: params.externalId,
      methods: ['PIX'],
      returnUrl: params.returnUrl,
      completionUrl: params.completionUrl,
    })

    return { checkoutId: checkout.id, url: checkout.url, status: checkout.status }
  }

  async createPixCharge(params: CreatePixChargeParams): Promise<PixCharge> {
    const charge = await abacateFetch<{ id: string; brCode: string; brCodeBase64: string; expiresAt: string; status: string }>(
      this.apiKey,
      '/transparents/create',
      {
        method: 'PIX',
        data: {
          amount: params.amountCents,
          description: params.description.slice(0, 500),
          expiresIn: params.expiresIn,
          externalId: params.externalId,
          customer: params.customer,
        },
      }
    )
    return { checkoutId: charge.id, brCode: charge.brCode, brCodeBase64: charge.brCodeBase64, expiresAt: charge.expiresAt, status: charge.status }
  }
}

/**
 * Best-effort por natureza (igual ao resto do projeto): sem chave configurada,
 * retorna null em vez de derrubar o boot — routes/shop.ts trata esse caso
 * mantendo a captura de pedido funcionando, só sem gerar link de pagamento
 * automático (mesmo comportamento de antes desta integração existir).
 */
export function createAbacatePayClient(apiKey: string | null): AbacatePayClient | null {
  if (!apiKey) {
    logger.warn('ABACATEPAY_API_KEY não configurada — pedidos serão registrados sem link de pagamento automático.')
    return null
  }
  return new RealAbacatePayClient(apiKey)
}

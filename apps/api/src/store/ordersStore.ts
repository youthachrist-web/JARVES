export interface OrderItem {
  productId: number
  name: string
  price: number
  qty: number
}

export interface NewOrder {
  customerName: string
  customerEmail: string
  customerPhone?: string
  items: OrderItem[]
  /** Soma dos itens (preço real do catálogo × quantidade), antes do cupom. */
  subtotal: number
  /** Valor abatido pelo cupom, em reais — 0 quando não há cupom válido. */
  discount: number
  /** subtotal - discount. Este é o valor que vira o link de pagamento. */
  total: number
  /** Código do cupom aplicado (já normalizado), ou null se nenhum. */
  couponCode: string | null
}

export interface PaymentInfo {
  provider: string
  checkoutId: string
  /** Null para cobrança Pix transparente (não existe URL — QR Code/copia-e-cola são devolvidos direto na resposta de POST /orders, nunca persistidos). */
  url: string | null
  status: string
}

export interface PaidOrderInfo {
  id: number
  customerEmail: string
  customerName: string
  total: number
}

export interface OrdersStore {
  create(order: NewOrder): Promise<{ id: number }>
  /** Grava o link/id de pagamento gerado após o pedido já existir (a
   * AbacatePay usa o id do próprio pedido como `externalId`, então o pedido
   * precisa existir primeiro). */
  attachPayment(orderId: number, payment: PaymentInfo): Promise<void>
  /** Chamado pelo webhook de confirmação de pagamento — casa pelo
   * `checkoutId` da AbacatePay e marca como pago. Retorna null se não achar
   * (ex.: reentrega de um webhook de pedido já removido). */
  markPaidByCheckoutId(checkoutId: string): Promise<PaidOrderInfo | null>
  /** Usado pelo storefront pra saber quando o Pix foi confirmado (ver
   * GET /orders/:id/status) — poll simples no próprio pedido, sem precisar
   * consultar a AbacatePay de novo (o webhook já atualiza isso). Retorna
   * null se o pedido não existir. */
  getStatus(orderId: number): Promise<'pendente' | 'pago' | null>
}

/**
 * Grava pedidos capturados pelo storefront (apps/storefront) na tabela
 * `pedidos` do Supabase, incluindo cupom aplicado e dados do link de
 * pagamento da AbacatePay (ver lib/abacatepay.ts e routes/shop.ts). O total
 * gravado aqui é sempre o recalculado no servidor a partir do catálogo real
 * — nunca o valor que o cliente mandou.
 */
export class SupabaseOrdersStore implements OrdersStore {
  constructor(
    private readonly supabaseUrl: string,
    private readonly serviceRoleKey: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private headers(extra: Record<string, string> = {}) {
    return {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...extra,
    }
  }

  async create(order: NewOrder): Promise<{ id: number }> {
    const res = await this.fetchImpl(`${this.supabaseUrl}/rest/v1/pedidos`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'return=representation' }),
      body: JSON.stringify({
        cliente_nome: order.customerName,
        cliente_email: order.customerEmail,
        cliente_telefone: order.customerPhone ?? null,
        itens: order.items,
        subtotal: order.subtotal,
        cupom: order.couponCode,
        desconto: order.discount,
        total: order.total,
        pagamento_status: 'pendente',
      }),
    })
    if (!res.ok) throw new Error(`Falha ao salvar pedido no Supabase (status ${res.status})`)
    const rows = (await res.json()) as Array<{ id: number }>
    return { id: rows[0].id }
  }

  async attachPayment(orderId: number, payment: PaymentInfo): Promise<void> {
    const res = await this.fetchImpl(`${this.supabaseUrl}/rest/v1/pedidos?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({
        pagamento_provedor: payment.provider,
        pagamento_checkout_id: payment.checkoutId,
        pagamento_link: payment.url,
        pagamento_status: payment.status,
      }),
    })
    if (!res.ok) throw new Error(`Falha ao gravar dados de pagamento no Supabase (status ${res.status})`)
  }

  async markPaidByCheckoutId(checkoutId: string): Promise<PaidOrderInfo | null> {
    const res = await this.fetchImpl(
      `${this.supabaseUrl}/rest/v1/pedidos?pagamento_checkout_id=eq.${encodeURIComponent(checkoutId)}`,
      {
        method: 'PATCH',
        headers: this.headers({ Prefer: 'return=representation' }),
        body: JSON.stringify({ pagamento_status: 'pago' }),
      }
    )
    if (!res.ok) throw new Error(`Falha ao marcar pedido como pago no Supabase (status ${res.status})`)
    const rows = (await res.json()) as Array<{ id: number; cliente_email: string; cliente_nome: string; total: number }>
    if (rows.length === 0) return null
    const row = rows[0]
    return { id: row.id, customerEmail: row.cliente_email, customerName: row.cliente_nome, total: row.total }
  }

  async getStatus(orderId: number): Promise<'pendente' | 'pago' | null> {
    const res = await this.fetchImpl(`${this.supabaseUrl}/rest/v1/pedidos?id=eq.${orderId}&select=pagamento_status`, {
      headers: this.headers(),
    })
    if (!res.ok) throw new Error(`Falha ao consultar status do pedido no Supabase (status ${res.status})`)
    const rows = (await res.json()) as Array<{ pagamento_status: 'pendente' | 'pago' }>
    return rows[0]?.pagamento_status ?? null
  }
}

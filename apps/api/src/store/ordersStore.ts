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
  total: number
}

export interface OrdersStore {
  create(order: NewOrder): Promise<{ id: number }>
}

/**
 * Grava pedidos capturados pelo storefront (apps/storefront) na tabela
 * `pedidos` do Supabase. Deliberadamente simples (sem gateway de pagamento):
 * o "checkout" aqui é uma captura de pedido + notificação por e-mail — o
 * lojista entra em contato para confirmar pagamento/frete, um modelo comum
 * para operações que ainda não têm um meio de pagamento próprio integrado.
 * Ver routes/shop.ts.
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
        total: order.total,
      }),
    })
    if (!res.ok) throw new Error(`Falha ao salvar pedido no Supabase (status ${res.status})`)
    const rows = (await res.json()) as Array<{ id: number }>
    return { id: rows[0].id }
  }
}

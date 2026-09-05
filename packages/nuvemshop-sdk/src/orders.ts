import type { NuvemshopClient } from './client.js'
import type { NuvemshopOrder } from './types.js'

export class OrdersResource {
  constructor(private client: NuvemshopClient) {}

  list(query?: { page?: number; per_page?: number; status?: string; since_id?: number }) {
    return this.client.get<NuvemshopOrder[]>('/orders', query)
  }

  listAll(query?: { status?: string }) {
    return this.client.listAll<NuvemshopOrder>('/orders', query)
  }

  get(id: number | string) {
    return this.client.get<NuvemshopOrder>(`/orders/${id}`)
  }

  /** Marca o pedido como "empacotado" — usado por integrações de fulfillment. */
  pack(id: number | string) {
    return this.client.post(`/orders/${id}/fulfillments`, {})
  }

  close(id: number | string) {
    return this.client.post(`/orders/${id}/close`, {})
  }
}

export interface NormalizedOrder {
  nuvemshopId: number
  number: number
  status: string
  paymentStatus: string
  total: number
  currency: string
  customerEmail: string | null
  itemCount: number
  createdAt: string | null
}

export function normalizeOrder(order: NuvemshopOrder): NormalizedOrder {
  return {
    nuvemshopId: order.id,
    number: order.number,
    status: order.status,
    paymentStatus: order.payment_status,
    total: order.total ? parseFloat(order.total) : 0,
    currency: order.currency ?? 'BRL',
    customerEmail: order.customer?.email ?? null,
    itemCount: (order.products ?? []).reduce((sum, p) => sum + (p.quantity ?? 0), 0),
    createdAt: order.created_at ?? null,
  }
}

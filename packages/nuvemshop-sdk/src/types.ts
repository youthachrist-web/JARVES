/**
 * Tipos públicos do SDK Nuvemshop/Tiendanube.
 * Baseado na documentação oficial (api v1) e nos payloads observados nas
 * integrações existentes do projeto.
 */

export interface NuvemshopTokenResponse {
  access_token: string
  token_type: 'bearer'
  scope: string
  /** Identificador da loja. A doc oficial usa `user_id`; algumas respostas trazem `store_id`. */
  user_id?: number | string
  store_id?: number | string
}

export interface StoredNuvemshopCredentials {
  storeId: string
  accessToken: string
  scope?: string
  connectedAt: string
}

export interface MultiLangText {
  pt?: string
  en?: string
  es?: string
  [locale: string]: string | undefined
}

export interface NuvemshopImage {
  id: number
  src: string
  position?: number
  alt?: MultiLangText | string[]
}

export interface NuvemshopVariant {
  id?: number
  price: string
  promotional_price?: string | null
  stock_management?: boolean
  stock?: number | null
  sku?: string | null
  weight?: string
  values?: Array<MultiLangText>
}

export interface NuvemshopCategory {
  id: number
  name: MultiLangText
}

export interface NuvemshopProduct {
  id: number
  name: MultiLangText
  description?: MultiLangText
  handle?: MultiLangText | string
  categories?: NuvemshopCategory[]
  images?: NuvemshopImage[]
  variants?: NuvemshopVariant[]
  published?: boolean
  free_shipping?: boolean
  created_at?: string
  updated_at?: string
}

export interface NuvemshopOrder {
  id: number
  number: number
  status: 'open' | 'closed' | 'cancelled'
  payment_status: 'pending' | 'authorized' | 'paid' | 'voided' | 'refunded' | 'partially_refunded'
  shipping_status?: 'unpacked' | 'shipped' | 'delivered' | string
  gateway?: string
  currency?: string
  total: string
  subtotal?: string
  customer?: NuvemshopCustomer
  products?: Array<{ product_id: number; variant_id?: number; quantity: number; price: string; name?: string }>
  created_at?: string
  updated_at?: string
}

export interface NuvemshopCustomer {
  id: number
  name?: string
  email?: string
  identification?: string
  phone?: string
  created_at?: string
  updated_at?: string
}

/** Tópicos de webhook suportados pela Nuvemshop (inclui os obrigatórios de LGPD/data protection). */
export type NuvemshopWebhookTopic =
  | 'app/uninstalled'
  | 'app/suspended'
  | 'app/resumed'
  | 'category/created'
  | 'category/updated'
  | 'category/deleted'
  | 'customer/created'
  | 'customer/updated'
  | 'customer/deleted'
  | 'order/created'
  | 'order/updated'
  | 'order/paid'
  | 'order/packed'
  | 'order/fulfilled'
  | 'order/cancelled'
  | 'order/pending'
  | 'order/voided'
  | 'order/edited'
  | 'product/created'
  | 'product/updated'
  | 'product/deleted'
  | 'domain/updated'
  | 'fulfillment/updated'
  | 'store/redact'
  | 'customers/redact'
  | 'customers/data_request'
  | (string & {})

export interface NuvemshopWebhookPayload {
  store_id: number | string
  event: NuvemshopWebhookTopic
  id?: number | string
  [key: string]: unknown
}

export interface NuvemshopApiError extends Error {
  status: number
  body: unknown
  retryable: boolean
}

export interface RateLimitInfo {
  limit: number | null
  remaining: number | null
  resetMs: number | null
}

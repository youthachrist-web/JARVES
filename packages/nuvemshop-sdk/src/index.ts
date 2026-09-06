export * from './env.js'
export * from './oauth.js'
export * from './webhooks.js'
export * from './client.js'
export * from './products.js'
export * from './orders.js'
export * from './customers.js'
export * from './store.js'
export type * from './types.js'

import { NuvemshopClient, type NuvemshopClientOptions } from './client.js'
import { ProductsResource } from './products.js'
import { OrdersResource } from './orders.js'
import { CustomersResource } from './customers.js'
import { StoreResource } from './store.js'

/**
 * Fachada de alto nível: `new Nuvemshop(opts).products.listAll()`.
 * Composição em vez de herança para manter cada recurso testável isoladamente.
 */
export class Nuvemshop {
  readonly client: NuvemshopClient
  readonly products: ProductsResource
  readonly orders: OrdersResource
  readonly customers: CustomersResource
  readonly store: StoreResource

  constructor(opts: NuvemshopClientOptions) {
    this.client = new NuvemshopClient(opts)
    this.products = new ProductsResource(this.client)
    this.orders = new OrdersResource(this.client)
    this.customers = new CustomersResource(this.client)
    this.store = new StoreResource(this.client)
  }
}

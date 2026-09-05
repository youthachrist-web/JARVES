import type { NuvemshopClient } from './client.js'
import type { NuvemshopCustomer } from './types.js'

export class CustomersResource {
  constructor(private client: NuvemshopClient) {}

  list(query?: { page?: number; per_page?: number; email?: string }) {
    return this.client.get<NuvemshopCustomer[]>('/customers', query)
  }

  listAll() {
    return this.client.listAll<NuvemshopCustomer>('/customers')
  }

  get(id: number | string) {
    return this.client.get<NuvemshopCustomer>(`/customers/${id}`)
  }
}

import type { NuvemshopClient } from './client.js'

export interface NuvemshopStoreInfo {
  id: number
  name: { pt?: string; en?: string; es?: string }
  url?: string
  business_id?: string
}

export class StoreResource {
  constructor(private client: NuvemshopClient) {}

  get() {
    return this.client.get<NuvemshopStoreInfo>('/store')
  }
}

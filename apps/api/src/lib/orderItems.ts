/**
 * Compartilhado entre routes/shop.ts (POST /orders) e routes/shipping.ts
 * (POST /shipping/quote) — ambos recebem a mesma forma de lista de itens do
 * carrinho vinda do storefront e precisam da mesma validação básica antes de
 * resolver contra o catálogo real.
 */
export interface RequestedItem {
  productId: number
  qty: number
}

export function isValidRequestedItem(x: unknown): x is RequestedItem {
  return !!x && typeof x === 'object' && typeof (x as RequestedItem).productId === 'number' && Number.isInteger((x as RequestedItem).qty) && (x as RequestedItem).qty > 0
}

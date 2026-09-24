import { logger } from '../logger.js'

export const MELHOR_ENVIO_PROD_URL = 'https://melhorenvio.com.br'
export const MELHOR_ENVIO_SANDBOX_URL = 'https://sandbox.melhorenvio.com.br'

export interface ShippingPackage {
  /** Identificador livre do item na cotação — usamos o nome do produto. */
  id: string
  width: number
  height: number
  length: number
  weight: number
  /** Valor declarado (seguro) do item, em reais — usamos o preço real do catálogo. */
  insurance_value: number
  quantity: number
}

export interface ShippingQuoteParams {
  originCep: string
  destinationCep: string
  packages: ShippingPackage[]
}

export interface ShippingOption {
  /** Id do serviço na Melhor Envio (ex.: 1 = PAC, 2 = SEDEX) — usado para
   * recalcular/validar a opção escolhida na hora de fechar o pedido. */
  id: number
  name: string
  company: string
  /** Preço final em reais (já considerando `custom_price`, quando a conta
   * tem desconto configurado no painel da Melhor Envio). */
  price: number
  deliveryTime: number | null
}

export interface MelhorEnvioClient {
  calculate(params: ShippingQuoteParams): Promise<ShippingOption[]>
}

interface MEQuoteResponseItem {
  id: number
  name: string
  price?: string
  custom_price?: string
  error?: string
  delivery_time?: number
  custom_delivery_time?: number
  company?: { id: number; name: string }
}

class RealMelhorEnvioClient implements MelhorEnvioClient {
  constructor(
    private readonly token: string,
    private readonly baseUrl: string,
    private readonly userAgent: string,
    private readonly fetchImpl: typeof fetch
  ) {}

  async calculate({ originCep, destinationCep, packages }: ShippingQuoteParams): Promise<ShippingOption[]> {
    const res = await this.fetchImpl(`${this.baseUrl}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        // Exigido pela Melhor Envio em todo request — formato recomendado:
        // "Nome da Aplicação (email de contato)".
        'User-Agent': this.userAgent,
      },
      body: JSON.stringify({
        from: { postal_code: originCep },
        to: { postal_code: destinationCep },
        products: packages,
      }),
    })
    const json = (await res.json().catch(() => null)) as MEQuoteResponseItem[] | null
    if (!res.ok || !Array.isArray(json)) {
      throw new Error(`MelhorEnvio: falha ao calcular frete (HTTP ${res.status})`)
    }
    // Transportadoras sem cobertura pra esse CEP/pacote voltam com `error`
    // preenchido e sem preço — descartadas, não são uma opção válida.
    return json
      .filter((opt) => !opt.error && (opt.custom_price ?? opt.price))
      .map((opt) => ({
        id: opt.id,
        name: opt.name,
        company: opt.company?.name ?? '',
        price: Number(opt.custom_price ?? opt.price),
        deliveryTime: opt.custom_delivery_time ?? opt.delivery_time ?? null,
      }))
  }
}

/**
 * Best-effort por natureza, mesmo padrão de lib/abacatepay.ts: sem token
 * configurado, retorna null em vez de derrubar o boot — routes/shipping.ts e
 * routes/shop.ts tratam esse caso respondendo 503 com mensagem clara em vez
 * de quebrar o checkout inteiro.
 */
export function createMelhorEnvioClient(
  token: string | null,
  baseUrl: string,
  userAgent: string,
  fetchImpl: typeof fetch = fetch
): MelhorEnvioClient | null {
  if (!token) {
    logger.warn('MELHOR_ENVIO_TOKEN não configurado — cotação de frete indisponível.')
    return null
  }
  return new RealMelhorEnvioClient(token, baseUrl, userAgent, fetchImpl)
}

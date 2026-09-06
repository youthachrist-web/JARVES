import { useEffect, useState } from 'react'

/**
 * Handshake com o admin da Nuvemshop para "apps incorporados" (In-Admin
 * Apps). Quando o painel é aberto dentro do iframe do admin da loja
 * (`?embedded=1`, adicionado pelo redirect de apps/api em
 * routes/nuvemshop.ts), a Nuvemshop só considera o app "carregado" depois
 * que ele chama `iAmReady()` via `@tiendanube/nexo` — sem isso, mesmo com a
 * página respondendo normalmente, o admin mostra "Ocorreu um erro com o
 * aplicativo".
 *
 * Fora de um iframe da Nuvemshop (acesso direto pelo navegador, uso local),
 * isso é só um no-op: o painel funciona exatamente igual.
 */
export function useNexoEmbed() {
  const [isEmbedded, setIsEmbedded] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const embedded = params.get('embedded') === '1'
    const appId = params.get('appId')
    setIsEmbedded(embedded)

    if (!embedded || !appId) return

    let cancelled = false
    ;(async () => {
      try {
        const Nexo = (await import('https://cdn.jsdelivr.net/npm/@tiendanube/nexo@1.3.1/+esm')).default
        if (cancelled) return
        const nexo = Nexo.create({ clientId: appId })
        await Nexo.connect(nexo)
        if (cancelled) return
        Nexo.iAmReady(nexo)
      } catch {
        // Não está de fato embutido no admin da Nuvemshop (ex.: alguém abriu
        // o link com ?embedded=1 direto no navegador) — ignora, o painel
        // continua funcionando normalmente.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { isEmbedded }
}

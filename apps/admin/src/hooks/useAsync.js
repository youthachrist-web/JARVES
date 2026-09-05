import { useCallback, useEffect, useState } from 'react'

/**
 * Hook mínimo de data-fetching: sem cache, sem retry automático — este é um
 * painel interno de baixo tráfego, uma dependência como react-query seria
 * peso desnecessário aqui (ver FASE 9: evitar dependências desnecessárias).
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null })

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fn()
      setState({ loading: false, error: null, data })
    } catch (err) {
      setState({ loading: false, error: err, data: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    run()
  }, [run])

  return { ...state, refetch: run }
}

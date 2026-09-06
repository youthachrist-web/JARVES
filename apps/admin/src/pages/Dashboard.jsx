import React from 'react'
import { api } from '../lib/apiClient.js'
import { useAsync } from '../hooks/useAsync.js'
import { Card, Badge, StatusPill, Spinner } from '../components/ui.jsx'

export default function Dashboard() {
  const health = useAsync(() => api.health(), [])
  const status = useAsync(() => api.nuvemshopStatus(), [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">Visão Geral</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <h3 className="text-xs uppercase tracking-wider text-neutral-gray-500 mb-2">API</h3>
          {health.loading ? (
            <Spinner />
          ) : health.error ? (
            <Badge tone="danger">Indisponível</Badge>
          ) : (
            <Badge tone="success">Online</Badge>
          )}
        </Card>

        <Card>
          <h3 className="text-xs uppercase tracking-wider text-neutral-gray-500 mb-2">Nuvemshop</h3>
          {status.loading ? (
            <Spinner />
          ) : status.error ? (
            <Badge tone="danger">Erro ao consultar</Badge>
          ) : !status.data?.configured ? (
            <Badge tone="warning">App não configurado</Badge>
          ) : status.data?.connected ? (
            <StatusPill connected label={status.data.storeName || `Loja ${status.data.storeId}`} />
          ) : (
            <Badge tone="warning">Não conectada</Badge>
          )}
        </Card>

        <Card>
          <h3 className="text-xs uppercase tracking-wider text-neutral-gray-500 mb-2">Supabase</h3>
          {health.loading ? (
            <Spinner />
          ) : (
            <Badge tone={health.data?.integrations?.supabase === 'configured' ? 'success' : 'warning'}>
              {health.data?.integrations?.supabase === 'configured' ? 'Configurado' : 'Não configurado'}
            </Badge>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="text-xs uppercase tracking-wider text-neutral-gray-500 mb-3">O que fazer agora</h3>
        <ul className="text-sm text-neutral-gray-600 space-y-1.5 list-disc pl-5">
          {!health.data && !health.loading && (
            <li>
              A API não respondeu em <code>Configurações → URL da API</code>. Confirme se <code>apps/api</code> está
              rodando e acessível.
            </li>
          )}
          {status.data?.configured === false && (
            <li>
              Configure <code>NUVEMSHOP_APP_ID</code>, <code>NUVEMSHOP_APP_SECRET</code> e{' '}
              <code>NUVEMSHOP_REDIRECT_URI</code> no ambiente de <code>apps/api</code>.
            </li>
          )}
          {status.data?.configured && !status.data?.connected && (
            <li>
              Vá em <strong>Integrações</strong> e conecte a loja Nuvemshop.
            </li>
          )}
          {status.data?.connected && <li>Loja conectada — use Integrações para sincronizar o catálogo.</li>}
        </ul>
      </Card>
    </div>
  )
}

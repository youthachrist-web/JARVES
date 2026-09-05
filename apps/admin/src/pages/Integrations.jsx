import React, { useState } from 'react'
import { api } from '../lib/apiClient.js'
import { loadSettings } from '../lib/settings.js'
import { useAsync } from '../hooks/useAsync.js'
import { Card, Badge, Button, StatusPill, Spinner } from '../components/ui.jsx'

export default function Integrations() {
  const status = useAsync(() => api.nuvemshopStatus(), [])
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [syncError, setSyncError] = useState(null)

  async function handleConnect() {
    const { apiBaseUrl } = loadSettings()
    window.location.href = api.nuvemshopConnectUrl(apiBaseUrl)
  }

  async function handleDisconnect() {
    if (!window.confirm('Desconectar a loja Nuvemshop? A sincronização automática vai parar até reconectar.')) return
    await api.disconnect().catch((e) => setSyncError(e.message))
    status.refetch()
  }

  async function handleSync() {
    setSyncing(true)
    setSyncError(null)
    setSyncResult(null)
    try {
      const result = await api.syncProducts()
      setSyncResult(result)
    } catch (e) {
      setSyncError(e.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">Integrações</h1>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold mb-1">Nuvemshop</h3>
            {status.loading ? (
              <Spinner />
            ) : status.data?.configured === false ? (
              <Badge tone="warning">Credenciais do app não configuradas em apps/api</Badge>
            ) : status.data?.connected ? (
              <StatusPill connected label={status.data.storeName || `Loja ${status.data.storeId}`} />
            ) : (
              <StatusPill connected={false} label="Não conectada" />
            )}
          </div>
          <div className="flex gap-2">
            {status.data?.connected ? (
              <Button variant="danger" onClick={handleDisconnect}>
                Desconectar
              </Button>
            ) : (
              <Button onClick={handleConnect} disabled={status.data?.configured === false}>
                Conectar loja
              </Button>
            )}
          </div>
        </div>
      </Card>

      {status.data?.connected && (
        <Card>
          <h3 className="font-bold mb-3">Sincronização manual de produtos</h3>
          <p className="text-sm text-neutral-gray-500 mb-4">
            Busca todo o catálogo da loja conectada via API oficial da Nuvemshop (com paginação e retry automáticos).
          </p>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing && <Spinner />} {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
          </Button>

          {syncError && <p className="mt-3 text-sm text-semantic-danger">{syncError}</p>}
          {syncResult && (
            <div className="mt-4 text-sm text-neutral-gray-600 space-y-1">
              <p>
                Total: <strong>{syncResult.total}</strong> · Sincronizados: <strong>{syncResult.synced}</strong> ·
                Falharam: <strong>{syncResult.failed}</strong>
              </p>
              {syncResult.failed > 0 && (
                <p className="text-semantic-warning">Veja detalhes na aba Logs.</p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

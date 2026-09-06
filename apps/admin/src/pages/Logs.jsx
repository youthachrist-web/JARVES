import React from 'react'
import { api } from '../lib/apiClient.js'
import { useAsync } from '../hooks/useAsync.js'
import { Card, Badge, Button, Spinner } from '../components/ui.jsx'

const LEVEL_TONE = { info: 'neutral', warn: 'warning', error: 'danger' }

export default function Logs() {
  const logs = useAsync(() => api.logs(100), [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Logs</h1>
        <Button variant="secondary" onClick={logs.refetch}>
          Atualizar
        </Button>
      </div>

      <Card>
        {logs.loading ? (
          <Spinner />
        ) : logs.error ? (
          <p className="text-sm text-semantic-danger">{logs.error.message}</p>
        ) : logs.data?.events?.length === 0 ? (
          <p className="text-sm text-neutral-gray-500">Nenhum evento registrado ainda.</p>
        ) : (
          <ul className="divide-y divide-neutral-gray-200">
            {logs.data?.events?.map((event) => (
              <li key={event.id} className="py-3 flex items-start gap-3">
                <Badge tone={LEVEL_TONE[event.level] || 'neutral'}>{event.category}</Badge>
                <div className="flex-1">
                  <p className="text-sm text-neutral-gray-700">{event.message}</p>
                  <p className="text-xs text-neutral-gray-400 mt-0.5">{new Date(event.createdAt).toLocaleString('pt-BR')}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

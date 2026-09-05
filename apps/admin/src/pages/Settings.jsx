import React, { useState } from 'react'
import { loadSettings, saveSettings } from '../lib/settings.js'
import { Card, Button, Input } from '../components/ui.jsx'

export default function Settings() {
  const [form, setForm] = useState(loadSettings())
  const [saved, setSaved] = useState(false)

  function handleSave(e) {
    e.preventDefault()
    saveSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">Configurações</h1>

      <Card>
        <form onSubmit={handleSave} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-neutral-gray-500 mb-1">
              URL base da API
            </label>
            <Input
              value={form.apiBaseUrl}
              onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value })}
              placeholder="http://localhost:3000"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-neutral-gray-500 mb-1">
              Chave de admin da API
            </label>
            <Input
              type="password"
              value={form.adminApiKey}
              onChange={(e) => setForm({ ...form, adminApiKey: e.target.value })}
              placeholder="mesmo valor de SESSION_SECRET em apps/api"
            />
            <p className="text-xs text-neutral-gray-400 mt-1">
              Guardada apenas no localStorage deste navegador — nunca enviada a nenhum lugar além da sua própria API.
            </p>
          </div>
          <Button type="submit">{saved ? '✓ Salvo' : 'Salvar'}</Button>
        </form>
      </Card>
    </div>
  )
}

import React, { useState } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import Integrations from './pages/Integrations.jsx'
import Settings from './pages/Settings.jsx'
import Logs from './pages/Logs.jsx'
import { useNexoEmbed } from './hooks/useNexoEmbed.js'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', Component: Dashboard },
  { id: 'integrations', label: 'Integrações', Component: Integrations },
  { id: 'logs', label: 'Logs', Component: Logs },
  { id: 'settings', label: 'Configurações', Component: Settings },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { isEmbedded } = useNexoEmbed()
  const [showConnectedBanner, setShowConnectedBanner] = useState(
    () => new URLSearchParams(window.location.search).get('justConnected') === '1'
  )
  const Active = TABS.find((t) => t.id === activeTab)?.Component ?? Dashboard

  return (
    <div className="min-h-screen bg-neutral-gray-100">
      {/* O admin da Nuvemshop já tem seu próprio cabeçalho/navegação ao redor
          do iframe — repetir o nosso aqui dentro ficaria redundante e
          "empilhado". Quando incorporado, mostra só as abas, sem o header
          completo com o nome da marca. */}
      {!isEmbedded && (
        <header className="bg-brand-primary-forest text-white">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <span className="font-body text-xl">thymos</span>
            <span className="text-xs uppercase tracking-widest text-brand-primary-mist">Painel Administrativo</span>
          </div>
        </header>
      )}
      <nav
        className={`${isEmbedded ? 'bg-white border-b border-neutral-200' : 'bg-brand-primary-forest border-t border-white/10'} flex gap-1 px-6 max-w-6xl mx-auto`}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === tab.id
                ? isEmbedded
                  ? 'border-brand-primary-forest text-brand-primary-forest'
                  : 'border-brand-secondary-sand text-white'
                : isEmbedded
                  ? 'border-transparent text-neutral-gray-500 hover:text-brand-primary-forest'
                  : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">
        {showConnectedBanner && (
          <div className="mb-6 bg-semantic-success/10 text-semantic-success text-sm font-bold px-4 py-3 rounded-thymos flex items-center justify-between">
            ✓ Loja conectada com sucesso à Nuvemshop!
            <button onClick={() => setShowConnectedBanner(false)} className="text-xs uppercase tracking-wide underline">
              Fechar
            </button>
          </div>
        )}
        <Active />
      </main>
    </div>
  )
}

import React, { useState } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import Integrations from './pages/Integrations.jsx'
import Settings from './pages/Settings.jsx'
import Logs from './pages/Logs.jsx'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', Component: Dashboard },
  { id: 'integrations', label: 'Integrações', Component: Integrations },
  { id: 'logs', label: 'Logs', Component: Logs },
  { id: 'settings', label: 'Configurações', Component: Settings },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const Active = TABS.find((t) => t.id === activeTab)?.Component ?? Dashboard

  return (
    <div className="min-h-screen bg-neutral-gray-100">
      <header className="bg-brand-primary-forest text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-body text-xl">thymos</span>
          <span className="text-xs uppercase tracking-widest text-brand-primary-mist">Painel Administrativo</span>
        </div>
        <nav className="max-w-6xl mx-auto px-6 flex gap-1 border-t border-white/10">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-brand-secondary-sand text-white'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Active />
      </main>
    </div>
  )
}

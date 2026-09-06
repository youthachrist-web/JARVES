/**
 * Átomos de UI minimalistas — deliberadamente sem Radix/shadcn para manter
 * o bundle do painel pequeno (ver FASE 9 do briefing: evitar dependências
 * desnecessárias). Estilizados com as cores da marca via Tailwind
 * (tailwind.config.js lê @thymos/tokens diretamente).
 */
import React from 'react'

export function Card({ children, className = '' }) {
  return <div className={`bg-white border border-neutral-200 rounded-thymos p-5 shadow-sm ${className}`}>{children}</div>
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-thymos text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-brand-primary-forest text-white hover:bg-neutral-black',
    secondary: 'bg-neutral-gray-100 text-neutral-gray-700 hover:bg-neutral-gray-200',
    danger: 'bg-semantic-danger text-white hover:opacity-90',
    ghost: 'text-brand-primary-forest hover:bg-brand-primary-mist',
  }
  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-neutral-gray-100 text-neutral-gray-700',
    success: 'bg-semantic-success/10 text-semantic-success',
    warning: 'bg-semantic-warning/10 text-semantic-warning',
    danger: 'bg-semantic-danger/10 text-semantic-danger',
  }
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wide ${tones[tone]}`}>{children}</span>
}

export function StatusPill({ connected, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-semantic-success' : 'bg-semantic-danger'}`} />
      <span className="text-sm text-neutral-gray-600">{label}</span>
    </div>
  )
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 border border-neutral-200 rounded-thymos text-sm focus:outline-none focus:ring-2 focus:ring-brand-secondary-sand ${props.className || ''}`}
    />
  )
}

export function Spinner({ className = '' }) {
  return (
    <svg className={`animate-spin h-4 w-4 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  )
}

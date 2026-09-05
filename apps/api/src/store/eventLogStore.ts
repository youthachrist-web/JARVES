/**
 * Log de eventos operacionais para alimentar a aba "Logs" do painel admin
 * (sincronizações, erros, webhooks recebidos). Nunca armazena dados
 * sensíveis (tokens, senhas) — ver `logger.ts#redact`, usado antes de
 * qualquer chamada a `record`.
 */
export type EventLevel = 'info' | 'warn' | 'error'
export type EventCategory = 'sync' | 'webhook' | 'oauth' | 'admin'

export interface LogEvent {
  id: string
  level: EventLevel
  category: EventCategory
  message: string
  detail?: Record<string, unknown>
  createdAt: string
}

export interface EventLogStore {
  record(event: Omit<LogEvent, 'id' | 'createdAt'>): Promise<void>
  recent(limit?: number): Promise<LogEvent[]>
}

/** Ring buffer em memória — suficiente para um único processo/dev. */
export class InMemoryEventLogStore implements EventLogStore {
  private events: LogEvent[] = []
  constructor(private readonly maxSize = 500) {}

  async record(event: Omit<LogEvent, 'id' | 'createdAt'>): Promise<void> {
    const entry: LogEvent = {
      ...event,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    this.events.unshift(entry)
    if (this.events.length > this.maxSize) this.events.length = this.maxSize
  }

  async recent(limit = 50): Promise<LogEvent[]> {
    return this.events.slice(0, limit)
  }
}

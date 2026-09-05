import nodemailer, { type Transporter } from 'nodemailer'
import type { SmtpConfig } from '../config.js'
import { logger } from '../logger.js'

/**
 * Envio de notificações por e-mail (pedido pago, app desinstalado...).
 * Deliberadamente best-effort: uma falha de SMTP nunca deve derrubar o
 * processamento de um webhook — é só registrada no log de eventos.
 */
export interface Mailer {
  send(subject: string, text: string): Promise<void>
}

class NoopMailer implements Mailer {
  async send(subject: string): Promise<void> {
    logger.warn(`SMTP não configurado — e-mail "${subject}" não foi enviado`, {})
  }
}

class SmtpMailer implements Mailer {
  private transporter: Transporter
  constructor(private config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    })
  }

  async send(subject: string, text: string): Promise<void> {
    await this.transporter.sendMail({
      from: `Thymos <${this.config.user}>`,
      to: this.config.notifyTo,
      subject: `[Thymos] ${subject}`,
      text,
    })
  }
}

export function createMailer(config: SmtpConfig | null): Mailer {
  return config ? new SmtpMailer(config) : new NoopMailer()
}

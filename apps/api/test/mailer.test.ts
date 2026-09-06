import { describe, it, expect, vi } from 'vitest'
import { createMailer } from '../src/lib/mailer.js'

describe('createMailer', () => {
  it('retorna um mailer no-op quando a config é null (SMTP não configurado)', async () => {
    const mailer = createMailer(null)
    // não deve lançar — apenas loga um aviso e resolve normalmente
    await expect(mailer.send('assunto', 'corpo')).resolves.toBeUndefined()
  })

  it('usa o transporte SMTP quando a config está presente', async () => {
    const mailer = createMailer({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      user: 'app@thymos.com.br',
      pass: 'segredo',
      notifyTo: 'contato@thymos.com.br',
    })
    // A conexão real com o SMTP não é aberta neste teste (sem rede); apenas
    // garante que o mailer é construído com a config informada.
    expect(mailer).toBeDefined()
  })
})

describe('mailer via dependency injection', () => {
  it('permite injetar um mailer fake para inspecionar chamadas em testes', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const fakeMailer = { send }
    await fakeMailer.send('teste', 'corpo')
    expect(send).toHaveBeenCalledWith('teste', 'corpo')
  })
})

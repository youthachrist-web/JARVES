# @thymos/nuvemshop-sdk

Cliente TypeScript para a API da Nuvemshop/Tiendanube (v1), usado por
`apps/api` e, quando necessário, por `apps/admin`. Cobre:

- **OAuth 2** (`src/oauth.ts`) — monta a URL de autorização e troca o `code`
  pelo `access_token` (tokens da Nuvemshop não expiram; não há refresh token).
- **Cliente HTTP** (`src/client.ts`) — headers obrigatórios (`Authentication`,
  `User-Agent`), retry com backoff exponencial + jitter para `429`/`5xx`/erros
  de rede, respeito ao rate limit via headers `x-rate-limit-*` (a API usa um
  leaky bucket por loja+app), paginação automática (`listAll`).
- **Webhooks** (`src/webhooks.ts`) — validação de assinatura HMAC-SHA256
  (`x-linkedstore-hmac-sha256`) em tempo constante, parsing seguro do
  payload, e um `IdempotencyStore` plugável para lidar com reentregas (a
  Nuvemshop pode reenviar o mesmo evento até 16 vezes em 48h).
- **Recursos**: `products`, `orders`, `customers`, `store`, com normalização
  para o formato interno do catálogo (`normalizeProduct`, `normalizeOrder`).
- **Validação de ambiente** (`src/env.ts`) — falha explicitamente se
  `NUVEMSHOP_APP_ID`/`APP_SECRET`/`REDIRECT_URI` estiverem ausentes (ou,
  opcionalmente, avisa e continua em modo "desconectado" em desenvolvimento).

## Uso

```ts
import { Nuvemshop, loadNuvemshopEnv, exchangeCodeForToken, buildAuthorizeUrl } from '@thymos/nuvemshop-sdk'

const env = loadNuvemshopEnv() // lança se faltar config

// 1) redirecionar o lojista para autorizar o app
const authorizeUrl = buildAuthorizeUrl(env, csrfState)

// 2) no callback, trocar o code pelo token
const token = await exchangeCodeForToken(env, req.query.code)

// 3) usar o cliente autenticado
const ns = new Nuvemshop({ storeId: token.user_id!, accessToken: token.access_token, userAgent: env.userAgent })
const products = await ns.products.listAll()
```

### Validando um webhook recebido

```ts
import { verifyWebhookSignature, parseWebhookPayload, webhookIdempotencyKey, WEBHOOK_SIGNATURE_HEADER } from '@thymos/nuvemshop-sdk'

// `rawBody` deve ser o corpo BRUTO da requisição (ver apps/api/src/middlewares/rawBody.ts)
const signature = req.headers[WEBHOOK_SIGNATURE_HEADER]
if (!verifyWebhookSignature(rawBody, signature, env.appSecret)) {
  return res.status(401).json({ error: 'assinatura inválida' })
}
const payload = parseWebhookPayload(rawBody)
const key = webhookIdempotencyKey(payload)
if (await idempotencyStore.hasSeen(key)) return res.status(200).json({ deduped: true })
await idempotencyStore.markSeen(key)
// ... processar payload.event de forma assíncrona (fila) e responder 2XX rápido
```

## Testes

```bash
npm run test --workspace packages/nuvemshop-sdk
```

36 testes cobrindo: sucesso, erro 401 (token inválido), erro 429 (rate limit
com retry), falha de rede (timeout/DNS), erro 5xx com recuperação, paginação
completa e página vazia (produto/loja inexistente), corpo de erro malformado,
assinatura de webhook válida/inválida/ausente/secret errado, payload de
webhook corrompido ou incompleto, deduplicação de evento repetido, e
validação de variáveis de ambiente ausentes.

## Por que não há refresh token?

A Nuvemshop emite tokens de acesso **sem expiração** no fluxo de
`authorization_code`. O token só deixa de ser válido se o lojista desinstalar
o app (webhook `app/uninstalled`) ou revogar o acesso manualmente — nesses
casos, o token armazenado deve ser apagado (ver `apps/api`).

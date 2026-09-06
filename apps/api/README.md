# @thymos/api

Servidor Node/Express/TypeScript que expõe:

- **OAuth Nuvemshop**: `GET /nuvemshop/connect`, `GET /nuvemshop/callback`,
  `GET /nuvemshop/status`, `POST /nuvemshop/disconnect`.
- **Sincronização** (protegida por `x-admin-api-key`): `POST
  /nuvemshop/sync/products`, `GET /nuvemshop/sync/orders`, `GET
  /nuvemshop/sync/customers`, `POST /nuvemshop/push/products`.
- **Webhooks**: `POST /webhooks/nuvemshop` (endpoint único para todos os
  tópicos, com validação HMAC-SHA256 + deduplicação), `GET
  /webhooks/nuvemshop/required-topics` (lista os 3 tópicos LGPD obrigatórios
  para homologação: `store/redact`, `customers/redact`,
  `customers/data_request`).
- **Logs**: `GET /nuvemshop/logs` — eventos recentes (sync, oauth, webhook)
  para a aba "Logs" do painel admin. Nunca expõe tokens/segredos.
- `GET /health`.

## Rodando localmente

```bash
cp ../../.env.example .env   # preencha com suas credenciais
npm install
npm run dev      # http://localhost:3000, hot-reload via tsx
npm run build && npm start   # build de produção
npm test         # 23 testes de integração (supertest)
```

## Segurança

- Webhooks validam a assinatura `x-linkedstore-hmac-sha256` sobre o corpo
  bruto da requisição antes de processar qualquer coisa (ver
  `@thymos/nuvemshop-sdk`).
- O `state` do fluxo OAuth é assinado (HMAC + timestamp) para prevenir CSRF,
  sem precisar de sessão/cookie server-side.
- Endpoints de sincronização manual exigem o header `x-admin-api-key`
  (comparado com `SESSION_SECRET`) — nunca ficam abertos publicamente.
- Sem `SESSION_SECRET`/`NUVEMSHOP_APP_SECRET` configurados, os endpoints que
  dependem deles respondem `503` explicando o que falta — nunca operam com
  valores mockados/inseguros por padrão.
- Sem `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, o servidor usa um
  `InMemoryCredentialsStore` (adequado só para desenvolvimento — os dados
  somem a cada restart) e avisa isso no log de boot.

## Arquitetura interna

```
src/
  app.ts            # factory do Express app (usada nos testes e no index.ts)
  index.ts           # bootstrap (lê env, sobe o servidor)
  config.ts          # validação de variáveis de ambiente
  logger.ts           # logger estruturado com redação de segredos
  nuvemshopState.ts   # state assinado do OAuth (proteção CSRF)
  middlewares/
    rawBody.ts        # captura corpo bruto p/ validação HMAC de webhook
    errorHandler.ts
    requireApiKey.ts
  store/
    credentialsStore.ts          # interface + implementação em memória
    supabaseCredentialsStore.ts  # implementação Supabase (produção)
    eventLogStore.ts             # log de eventos p/ painel admin
  routes/
    health.ts
    nuvemshop.ts       # OAuth + sync + push + logs
    webhooks.ts        # endpoint único de webhooks
```

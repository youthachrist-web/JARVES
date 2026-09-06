# Auditoria de Segurança

Resumo do que foi verificado e corrigido nesta consolidação (FASE 12 do
briefing). Não substitui uma auditoria profissional externa antes de um
lançamento com tráfego real de pagamento.

## Exposição de segredos

- ✅ Nenhuma credencial real está commitada neste repositório (verificado
  por busca literal pelos valores fornecidos no início do projeto, além de
  varredura por padrões comuns de secret).
- ✅ `.gitignore` bloqueia `.env`, builds, e artefatos de ambiente Replit.
- ✅ `.env.example` contém apenas placeholders — nunca um valor real.
- ✅ `apps/admin`/`apps/storefront` (frontend) nunca recebem
  `NUVEMSHOP_APP_SECRET` nem `SUPABASE_SERVICE_ROLE_KEY` — essas variáveis
  só existem no processo de `apps/api` (backend).
- ✅ A "chave de admin" do painel fica só no `localStorage` do navegador do
  operador, nunca no bundle JS público nem em nenhum arquivo do repositório.
- ✅ Logs (`apps/api/src/logger.ts`) redigem automaticamente chaves
  sensíveis conhecidas antes de serializar qualquer objeto.

## Webhooks (era o ponto mais frágil da integração original)

- ✅ **Corrigido**: os 3 handlers de webhook LGPD do `dashbosrd` original
  (`customer-data-request.js`, `customer-redact.js`, `store-redact.js`)
  **não validavam a origem da requisição** — qualquer request não
  autenticado era aceito e processado. A consolidação valida a assinatura
  `x-linkedstore-hmac-sha256` (HMAC-SHA256, comparação em tempo constante)
  antes de processar qualquer payload.
- ✅ Deduplicação de eventos reentregues (a Nuvemshop reenvia até 16x/48h).
- ✅ Resposta 2XX enviada antes do processamento pesado (evita timeout do
  lado da Nuvemshop, que espera ~3s).

## CSRF

- ✅ O fluxo OAuth usa um `state` assinado (HMAC + timestamp, expira em 15
  min) para impedir que um link forjado induza conexão/desconexão
  indevida da loja — sem precisar de sessão/cookie server-side.

## Autorização

- ✅ Endpoints administrativos (`sync`, `push`, `disconnect`, `logs`)
  exigem `x-admin-api-key`; sem `SESSION_SECRET` configurado, respondem
  503 em vez de ficar abertos por padrão.
- ⚠️ **Pendência conhecida**: não há autenticação de usuário individual no
  painel — uma única chave compartilhada para todos os operadores. Para
  múltiplos operadores com auditoria por usuário, adicionar autenticação
  real (ex.: Supabase Auth) é o próximo passo recomendado antes de dar
  acesso a mais de uma pessoa.

## Validação de entrada

- ✅ Rotas administrativas validam presença de campos obrigatórios (`action`,
  `product`, `product.nuvemshopId` para exclusão) antes de chamar a API
  Nuvemshop.
- ✅ Payload de webhook validado (`event`/`store_id` obrigatórios) antes de
  qualquer processamento; JSON malformado é rejeitado com 400 pelo parser
  do Express antes mesmo de chegar à rota.

## CORS

- ✅ Lista explícita de origens permitidas (`CORS_ALLOWED_ORIGINS`) — sem
  wildcard `*` quando `x-admin-api-key` está em jogo.

## Rate limiting / abuso

- ✅ O cliente da Nuvemshop (`packages/nuvemshop-sdk`) respeita os headers
  `x-rate-limit-*` da própria Nuvemshop e faz backoff.
- ⚠️ **Pendência conhecida**: `apps/api` em si não tem rate limiting nas
  próprias rotas administrativas (ex.: contra brute-force de
  `x-admin-api-key`). Recomendado adicionar um middleware de rate limit
  (ex.: `express-rate-limit`) antes de expor a API publicamente sem VPN/IP
  allowlist.

## Dependências

- Dependências mantidas deliberadamente mínimas em cada app (ver
  `apps/admin/README.md` sobre a decisão de não usar shadcn/Radix). Rodar
  `npm audit` periodicamente é responsabilidade contínua do time, não uma
  verificação pontual desta consolidação.

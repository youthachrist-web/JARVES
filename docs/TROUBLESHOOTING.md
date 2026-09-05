# Troubleshooting

## `apps/api` responde 503 em tudo relacionado à Nuvemshop

Faltam `NUVEMSHOP_APP_ID` / `NUVEMSHOP_APP_SECRET` / `NUVEMSHOP_REDIRECT_URI`
no ambiente. Confira com `GET /health` — `integrations.nuvemshop` deve ser
`"configured"`.

## `GET /nuvemshop/status` retorna `connected: false` mesmo após autorizar

- Confirme que `NUVEMSHOP_REDIRECT_URI` é **exatamente** igual à URL
  cadastrada no painel de parceiros Nuvemshop (barra final, http vs https,
  etc. importam).
- Veja `/nuvemshop/logs` — um evento `oauth` com nível `error` mostra a
  causa exata (ex.: `code` expirado, `client_secret` incorreto).
- Sem Supabase configurado, as credenciais ficam em memória e **somem a
  cada restart do processo** — normal em dev, um problema real em produção
  (configure `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`).

## Webhooks retornam 401 (assinatura inválida)

- O `NUVEMSHOP_APP_SECRET` no `.env` de `apps/api` não bate com o secret
  real do app no painel de parceiros — copie de novo.
- Confirme que nenhum proxy/CDN na frente da API está alterando o corpo da
  requisição (a assinatura é calculada sobre os bytes exatos recebidos).
- Isso é esperado (e seguro) para qualquer requisição forjada/de teste sem
  assinatura real — não é um bug se vier de uma ferramenta como `curl` sem
  o header `x-linkedstore-hmac-sha256` calculado corretamente.

## Painel admin não carrega dados (erro de rede)

- Confira **Configurações** → URL da API está correta e acessível a partir
  do navegador (não apenas do servidor).
- Erro de CORS no console do navegador → adicione a origem do painel em
  `CORS_ALLOWED_ORIGINS` no `.env` de `apps/api` e reinicie o servidor.

## Painel admin mostra 401 ao tentar sincronizar/desconectar

A chave em **Configurações → Chave de admin da API** não bate com
`SESSION_SECRET` do backend. São o mesmo valor por definição — copie de um
para o outro.

## Sincronização de produtos retorna `failed > 0`

Veja `errors` na resposta (ou a aba Logs) — cada item mostra `{ id, error }`
do produto específico que falhou a normalizar. Produtos sem variantes ou
com categoria muito diferente do mapeamento padrão (ver
`packages/nuvemshop-sdk/src/products.ts#CATEGORY_MAP`) caem no fallback
"Conjunto" em vez de falhar — falhas reais geralmente indicam dado
malformado vindo da API (ex.: preço não numérico).

## `npm ci` falha / lockfile fora de sincronia

Rode `npm install` na raiz do monorepo (não dentro de um app específico)
para regenerar `package-lock.json` de forma consistente com os workspaces.

## Testes passam localmente mas falham no CI

Confirme que está usando Node 20 (`.github/workflows/ci.yml` fixa essa
versão) — comportamento de `fetch`/`crypto` nativo pode variar entre
versões do Node.

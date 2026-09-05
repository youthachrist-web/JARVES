# Configurando a integração com a Nuvemshop

Este guia cobre o que o **proprietário da loja/app** precisa fazer no
painel da Nuvemshop — nada aqui é feito pelo código, é configuração externa.

## 1. App parceiro

- App ID já existente: **32653** (não é segredo — aparece publicamente na
  URL de autorização OAuth).
- O **client secret** do app (`NUVEMSHOP_APP_SECRET`) deve ser copiado do
  painel de parceiros Nuvemshop e colocado **somente** na variável de
  ambiente do deploy de `apps/api` — nunca em código, nunca em `.env`
  versionado.

## 2. Callback OAuth

No painel de parceiros, configure a URL de callback do app para:

```
https://<seu-dominio-da-api>/nuvemshop/callback
```

Isso deve ser **exatamente** igual ao valor de `NUVEMSHOP_REDIRECT_URI` no
`.env` de `apps/api`.

## 3. Escopos (permissões) solicitados

Configurados via `NUVEMSHOP_SCOPES` (padrão já incluído em
`.env.example`):

- `read_products`, `write_products` — catálogo
- `read_orders`, `write_orders` — pedidos
- `read_customers`, `write_customers` — clientes

Ajuste conforme o app for aprovado com escopos diferentes no painel de
parceiros — os escopos efetivos são sempre os que a Nuvemshop concede na
tela de autorização, não apenas o que o app solicita.

## 4. Webhooks

Cadastre **uma única URL** para todos os tópicos de webhook:

```
https://<seu-dominio-da-api>/webhooks/nuvemshop
```

### Tópicos obrigatórios para homologação (LGPD / proteção de dados)

- `store/redact`
- `customers/redact`
- `customers/data_request`

(Confirmável em runtime via `GET /webhooks/nuvemshop/required-topics`.)

### Tópicos recomendados adicionais

`product/created`, `product/updated`, `product/deleted`, `order/created`,
`order/updated`, `order/paid`, `order/cancelled`, `customer/created`,
`customer/updated`, `app/uninstalled`.

O endpoint valida a assinatura `x-linkedstore-hmac-sha256` contra
`NUVEMSHOP_APP_SECRET` — se esse valor estiver errado no `.env`, **todo**
webhook será rejeitado com 401. Teste com `GET /health` primeiro para
confirmar que o app está configurado antes de depurar webhooks.

## 5. Conectando a loja (fluxo do lojista)

1. Acesse `https://<dominio-da-api>/nuvemshop/connect` (ou clique em
   "Conectar loja" no painel admin).
2. Autorize o app na tela da Nuvemshop.
3. Você será redirecionado de volta e verá uma página de confirmação com o
   ID da loja.
4. Confirme em `GET /nuvemshop/status` que `connected: true`.

## 6. Ambiente de teste

A Nuvemshop não oferece um "sandbox" de API separado da produção — testes
devem ser feitos numa loja de desenvolvimento real (gratuita/de testes) no
próprio painel Nuvemshop. Recomendado: criar uma loja de testes dedicada
antes de conectar a loja de produção da Thymos.

## 7. Pendência conhecida

Esta integração foi implementada e testada inteiramente com **mocks e
contratos oficiais da API** (ver testes em
`packages/nuvemshop-sdk/test/` e `apps/api/test/`) — a validação end-to-end
com a loja real da Thymos (contatothymosfits@gmail.com) depende de:

1. O proprietário preencher `NUVEMSHOP_APP_SECRET` real no ambiente de
   produção de `apps/api`.
2. Completar o fluxo de conexão (`/nuvemshop/connect`) uma vez, manualmente.

Nenhuma etapa de código está bloqueada por isso — apenas a validação final
com dados reais da loja.

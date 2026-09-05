# API — Referência de Endpoints (`apps/api`)

Base URL: configurável (`VITE_API_BASE_URL` no admin, `PORT` no servidor).
Todas as respostas são JSON, exceto `/nuvemshop/callback` (HTML de
confirmação).

## Públicos (sem autenticação)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Status da API e quais integrações estão configuradas |
| GET | `/nuvemshop/connect` | Redireciona para a autorização OAuth da Nuvemshop |
| GET | `/nuvemshop/callback` | Callback OAuth — troca `code` por token, salva credenciais |
| GET | `/nuvemshop/status` | `{ connected, configured, storeId?, storeName? }` |
| POST | `/webhooks/nuvemshop` | Recebe webhooks da Nuvemshop (valida assinatura HMAC internamente) |
| GET | `/webhooks/nuvemshop/required-topics` | Lista os tópicos LGPD obrigatórios |

## Administrativos (exigem header `x-admin-api-key`)

O valor deve ser igual a `SESSION_SECRET` configurado em `apps/api`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/nuvemshop/disconnect` | Remove as credenciais salvas da loja |
| POST | `/nuvemshop/sync/products` | Busca todo o catálogo da Nuvemshop (paginado) e normaliza |
| GET | `/nuvemshop/sync/orders?status=` | Lista pedidos (filtro opcional por status) |
| GET | `/nuvemshop/sync/customers` | Lista clientes |
| POST | `/nuvemshop/push/products` | Cria/atualiza/exclui um produto na Nuvemshop — body: `{ action: 'create'\|'update'\|'delete', product: {...} }` |
| GET | `/nuvemshop/logs?limit=` | Eventos recentes (sync/oauth/webhook/admin) |

### Exemplo — sincronizar produtos

```bash
curl -X POST https://api.thymos.com.br/nuvemshop/sync/products \
  -H "x-admin-api-key: $SESSION_SECRET"
```

Resposta:

```json
{
  "success": true,
  "total": 42,
  "synced": 40,
  "failed": 2,
  "errors": [{ "id": 123, "error": "..." }],
  "products": [{ "nuvemshopId": 1, "name": "...", "category": "...", "price": 249.9, "...": "..." }]
}
```

### Exemplo — criar produto na Nuvemshop

```bash
curl -X POST https://api.thymos.com.br/nuvemshop/push/products \
  -H "x-admin-api-key: $SESSION_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "product": {
      "name": "Legging Sculpt",
      "description": "...",
      "price": 249.9,
      "stock": 12,
      "sku": "LEG-001",
      "images": ["https://.../foto1.jpg"]
    }
  }'
```

## Erros

Todas as respostas de erro seguem `{ "error": "mensagem", "detail"?: ... }`.
Status comuns:

- `400` — payload inválido (ex.: campos obrigatórios ausentes)
- `401` — `x-admin-api-key` ausente/incorreta, ou assinatura de webhook inválida
- `503` — dependência não configurada (ex.: `NUVEMSHOP_APP_SECRET` ausente,
  ou loja ainda não conectada)
- `500` — erro interno (logado em `/nuvemshop/logs`, nunca vaza stack trace)

## Consumindo diretamente a Nuvemshop (para integrações futuras)

O pacote `@thymos/nuvemshop-sdk` expõe um cliente tipado reutilizável fora
de `apps/api` (ex.: um script de sincronização em batch, uma função
serverless separada). Ver `packages/nuvemshop-sdk/README.md`.

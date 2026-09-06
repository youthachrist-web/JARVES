# Deploy

Cada app do monorepo é independente e pode ser deployado separadamente.

## Status atual (Railway)

O projeto **thymos-ecommerce** já foi criado na Railway com os dois serviços
configurados (build/start command, variáveis de ambiente e domínio público
já definidos):

| Serviço | Domínio | Build | Start |
|---|---|---|---|
| `api` | `api-production-c13f.up.railway.app` | `npm run build --workspace apps/api` | `node apps/api/dist/index.js` |
| `admin` | `admin-production-31e1.up.railway.app` | `npm run build --workspace apps/admin` | `npx --yes serve@14 -s apps/admin/dist -l $PORT` |

Ambos apontam para o branch `claude/ecommerce-nuvemshop-integration-wppk2d`
do repositório `youthachrist-web/JARVES`. As variáveis de ambiente
(`NUVEMSHOP_APP_ID`, `NUVEMSHOP_APP_SECRET`, `NUVEMSHOP_REDIRECT_URI`,
`SESSION_SECRET`, `CORS_ALLOWED_ORIGINS`, `NODE_ENV`, `VITE_API_BASE_URL`)
já foram configuradas diretamente na Railway — nunca neste repositório.

**Pendência**: o disparo do primeiro deploy de cada serviço exige uma sessão
autenticada real no painel da Railway (a API de automação não tem essa
permissão por design, só configuração) — acesse
`railway.app/project/943631b2-26e1-4d75-8a9d-f074436daba8` e clique em
**Deploy** em cada serviço (`api`, depois `admin`). Depois do primeiro
deploy manual, pushes futuros no branch conectado devem re-deployar
automaticamente.

## apps/api (Node/Express)

Qualquer host Node funciona (Railway, Render, Fly.io, um VPS com PM2...).

```bash
cd apps/api
npm install
npm run build
npm start   # node dist/index.js
```

Variáveis de ambiente obrigatórias em produção (ver `.env.example` na raiz):

- `NUVEMSHOP_APP_ID`, `NUVEMSHOP_APP_SECRET`, `NUVEMSHOP_REDIRECT_URI`
- `SESSION_SECRET` (protege o OAuth e os endpoints administrativos)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (opcional — sem eles, o
  servidor funciona com armazenamento em memória, adequado só para dev)
- `CORS_ALLOWED_ORIGINS` — inclua o domínio real de `apps/admin`

**Importante**: `NUVEMSHOP_REDIRECT_URI` deve apontar para o domínio final
de produção e estar cadastrado identicamente no painel de parceiros
Nuvemshop (ver `docs/NUVEMSHOP_SETUP.md`).

## apps/admin (painel administrativo)

Build estático servido por `serve` — qualquer host Node funciona igual ao
da API (ver tabela acima). Alternativamente, qualquer CDN de site estático
(Vercel, Netlify, Cloudflare Pages) também serve `apps/admin/dist` direto.

```bash
cd apps/admin
npm install
npm run build   # gera dist/
```

Variável de build: `VITE_API_BASE_URL` deve apontar para a URL pública de
`apps/api` já deployada. Após o primeiro acesso, o operador confirma/ajusta
isso e cola a chave de admin em **Configurações** dentro do próprio painel
(fica salvo só no navegador dele).

## apps/storefront (loja pública)

HTML/CSS/JS estático, sem build step. Duas formas de publicar:

1. **CDN/host estático genérico** (Vercel, Netlify, Cloudflare Pages,
   S3+CloudFront): publique o conteúdo de `apps/storefront/` diretamente.
2. **Hospedagem de tema Nuvemshop**: se a decisão comercial for usar a
   própria Nuvemshop para hospedar a vitrine (não apenas o backend/checkout),
   este HTML/CSS/JS serve de base para um tema customizado da plataforma —
   adaptação adicional necessária, fora do escopo desta consolidação.

Antes de publicar, preencha `window.THYMOS_CONFIG.nuvemshopStoreDomain` em
`index.html` com o domínio da loja já conectada, para o botão de checkout
funcionar.

## Ordem recomendada de deploy

1. `apps/api` primeiro (precisa estar no ar para cadastrar a callback URL
   no painel de parceiros Nuvemshop).
2. Conectar a loja (`docs/NUVEMSHOP_SETUP.md`).
3. `apps/admin`, apontando para a API já no ar.
4. `apps/storefront`, com o domínio da loja preenchido.

## CI/CD

`.github/workflows/ci.yml` roda lint + typecheck + testes + build em todo
PR e push para `main`. Não há deploy automático configurado no GitHub
Actions — o deploy de produção usa a integração git nativa da Railway
(descrita acima).

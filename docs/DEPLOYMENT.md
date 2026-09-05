# Deploy

Cada app do monorepo é independente e pode ser deployado separadamente.

## apps/api (Node/Express)

Qualquer host Node funciona (Railway, Render, Fly.io, um VPS com PM2...).
Este projeto foi desenvolvido pensando em **Railway** (já disponível como
integração neste ambiente de desenvolvimento) ou **Vercel** (funções
serverless), mas não depende de nenhum dos dois especificamente.

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

Build estático — qualquer CDN/host de site estático funciona (Vercel,
Netlify, Cloudflare Pages).

```bash
cd apps/admin
npm install
npm run build   # gera dist/
```

Variável de build: `VITE_API_BASE_URL` deve apontar para a URL pública de
`apps/api` já deployada. Após o primeiro acesso, o operador confirma/ajusta
isso e cola a chave de admin em **Configurações** dentro do próprio painel
(fica salvo só no navegador dele).

O painel não expõe nenhuma rota pública sensível — ainda assim, recomenda-se
protegê-lo atrás de autenticação básica do provedor de hosting ou de uma
VPN/allowlist de IP, já que ele não tem login próprio nesta versão (ver
pendências em `apps/admin/README.md`).

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
PR e push para `main`. Não há deploy automático configurado — cada
ambiente de produção deve ser conectado manualmente ao provedor de hosting
escolhido (decisão do proprietário do projeto, não inferível pelo código).

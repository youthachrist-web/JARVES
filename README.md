# Thymos — E-commerce + Integração Nuvemshop

Plataforma de e-commerce da **Thymos** (marca brasileira de activewear
premium, fundada em 2019): loja pública, painel administrativo e API de
integração com a Nuvemshop, consolidados a partir de dois protótipos
(`thymos-fit` e `dashbosrd`) num único monorepo com identidade visual
oficial aplicada.

## Visão geral

```
apps/
  storefront/   Loja pública — HTML/CSS/JS, sem build step
  admin/        Painel administrativo — React + Vite + Tailwind
  api/          API — Node/Express/TypeScript (OAuth, sync, webhooks Nuvemshop)
packages/
  tokens/       Design tokens da marca (cores, tipografia, spacing...) — fonte única
  nuvemshop-sdk/  Cliente TypeScript tipado para a API da Nuvemshop
docs/           Documentação técnica (API, deploy, setup Nuvemshop, troubleshooting)
```

Cada app é independente e pode ser deployado separadamente (ver
`docs/DEPLOYMENT.md`). `packages/tokens` e `packages/nuvemshop-sdk` são
compartilhados entre eles via npm workspaces — nenhuma cor, fonte ou lógica
de integração está duplicada em mais de um lugar.

## Documentação

| Arquivo | Conteúdo |
|---|---|
| `IMPLEMENTATION_PLAN.md` | Auditoria dos repositórios originais, estratégia de fusão, arquitetura |
| `REFERENCE_ANALYSIS.md` | Análise de UX dos sites de referência (Vuori, Lululemon) |
| `BEST_OF_REFERENCES.md` | O que foi efetivamente incorporado ao storefront |
| `docs/API.md` | Referência de endpoints de `apps/api` |
| `docs/NUVEMSHOP_SETUP.md` | Configuração do app/webhooks no painel de parceiros Nuvemshop |
| `docs/DEPLOYMENT.md` | Deploy de cada app |
| `docs/TROUBLESHOOTING.md` | Erros comuns e soluções |
| `FINAL_REPORT.md` | Relatório final — o que foi feito, o que falta, como rodar tudo |

## Instalação

```bash
git clone <este-repositório>
cd JARVES
npm install          # instala todos os workspaces de uma vez
cp .env.example .env # preencha com suas credenciais (ver docs/NUVEMSHOP_SETUP.md)
```

## Desenvolvimento

```bash
npm run dev:api         # apps/api        — http://localhost:3000
npm run dev:admin       # apps/admin      — http://localhost:5173
npm run dev:storefront  # apps/storefront — http://localhost:4173
```

## Variáveis de ambiente

Ver `.env.example` na raiz — cobre `apps/api` (Nuvemshop, Supabase,
sessão) e as variáveis `VITE_*` de `apps/admin`/`apps/storefront`.
**Nunca** commitar um `.env` real; o `.gitignore` já bloqueia isso.

## Nuvemshop

Guia completo em `docs/NUVEMSHOP_SETUP.md`: app parceiro, callback OAuth,
escopos, webhooks (incluindo os 3 tópicos LGPD obrigatórios para
homologação), e o fluxo de conexão da loja.

## Testes

```bash
npm run test --workspaces --if-present
```

59 testes automatizados (`packages/nuvemshop-sdk` + `apps/api`) cobrindo
sucesso, erros de API (401/429/5xx), timeout/falha de rede, dados
inválidos, webhook duplicado/adulterado/sem assinatura, token inválido,
paginação vazia/completa, e configuração ausente.

## Deploy

Ver `docs/DEPLOYMENT.md`.

## Segurança

- Segredos **somente** em variáveis de ambiente — nunca em código, nunca
  no bundle do frontend (`apps/admin`/`apps/storefront` só recebem
  variáveis `VITE_*`, que são públicas por definição do Vite; nenhum
  segredo real vive nelas).
- Webhooks da Nuvemshop validam assinatura HMAC-SHA256 antes de processar
  qualquer coisa.
- Endpoints administrativos exigem uma chave (`x-admin-api-key`), nunca
  ficam abertos publicamente.
- `.gitignore` bloqueia `.env` real, builds e artefatos de ambiente
  (Replit) que não pertencem a um repositório de produção.

## Licença

Projeto proprietário — todos os direitos reservados à Thymos.

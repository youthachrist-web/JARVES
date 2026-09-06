# Plano de Implementação — Thymos E-commerce

> Autor: Claude (agente autônomo) · Última atualização: 2026-09-05

## 1. Contexto e fontes analisadas

| Fonte | Conteúdo | Local |
|---|---|---|
| `thymos-fit` (hilcar404/thymos-fit) | Storefront estático (HTML/CSS/JS), tema "nude/creme" provisório, carrinho client-side, popup, produtos mockados | `apps/storefront` (origem) |
| `dashbosrd` (youthachrist-web/dashbosrd) | Painel admin React + Vite + Tailwind + Supabase, funções serverless de integração Nuvemshop (`api/nuvemshop-*.js`), webhooks LGPD, sub-projetos `artifacts/api-server` (Express/TS) e `artifacts/catalogo` (React/shadcn) | `apps/admin`, `apps/api` (origem) |
| Manual da marca Thymos (PDF, 3 páginas efetivas) | Paleta, tipografia, tom de voz, fotografia | `packages/tokens` |
| Nuvemshop App 32653 | Client ID/secret, painel `contatothymosfits@gmail.com` | `.env` (não versionado) |
| vuoriclothing.com / shop.lululemon.com | Referências de UX/UI | `REFERENCE_ANALYSIS.md` |

## 2. Auditoria técnica

### 2.1 `thymos-fit` (storefront)
- **Stack**: HTML/CSS/JS puro, sem build step, sem framework.
- **Funciona**: hero, navbar com transição on-scroll, popup de boas-vindas, grid de categorias, carrinho client-side (drawer), ticker, depoimentos, newsletter — tudo com dados mockados em `script.js` e imagens locais em `/image`.
- **Quebrado/incompleto**: nenhuma integração com API real (produtos hardcoded), checkout é só um botão sem ação, sem SEO técnico (falta meta OG, sitemap, schema.org), sem testes, sem CI, paleta e tipografia **divergem do manual de marca oficial** (usa nude/bege + Bebas Neue/Montserrat/Cormorant Garamond, quando a marca real é verde floresta + Comfortaa/Bebas Neue).
- **Reaproveitável**: toda a arquitetura de UX (hero cinematográfico, split sections estilo Lululemon, trio gallery estilo Alo, carrinho com barra de frete grátis, modal de produto com galeria) é sólida e bem construída — decisão: **manter a estrutura, trocar o design system**.

### 2.2 `dashbosrd` (admin + API)
- **Stack**: Vite + React 18 + Tailwind + Supabase (Postgres/REST) para o app principal; dentro de `artifacts/` existem 3 sub-projetos Replit não integrados ao app principal:
  - `api-server`: Express + TypeScript, rotas `health`, `nuvemshop`, `produtos`, `notificar` — mais bem estruturado que os `api/*.js` soltos na raiz, porém incompleto (rotas vazias/stub).
  - `catalogo`: React + TypeScript + shadcn/ui (Radix) + Tailwind — componentes de catálogo (`catalog-grid`, `nuvemshop-sync`, `product-card`) com qualidade de UI superior ao app principal (design tokens shadcn, componentes acessíveis).
  - `mockup-sandbox`: sandbox de geração de mockups, não crítico para o e-commerce.
- **Funciona**: OAuth Nuvemshop (`nuvemshop-connect.js` → `nuvemshop-callback.js`), leitura de status (`nuvemshop-status.js`), sincronização de catálogo Nuvemshop → Supabase (`nuvemshop-sync.js`), push Supabase → Nuvemshop (`nuvemshop-push.js`), 3 webhooks LGPD (`customer-data-request`, `customer-redact`, `store-redact`).
- **Quebrado/incompleto/inseguro**:
  - Webhooks **não validam assinatura HMAC** (`x-linkedstore-hmac-sha256`) — qualquer request pode fingir ser a Nuvemshop. **Corrigido nesta consolidação.**
  - Nenhum tratamento de rate limit (headers `x-rate-limit-*`) nem retry/backoff.
  - Nenhuma deduplicação de eventos de webhook (a Nuvemshop pode reenviar até 16 vezes) — risco de sync duplicada.
  - Token de acesso e store_id armazenados em texto plano numa tabela Supabase acessível via `anon key` — aceitável como MVP, mas deve migrar para tabela protegida por RLS + service role no servidor.
  - `.replit`/`attached_assets`/artefatos Replit não pertencem a um repositório de produção.
- **Reaproveitável**: fluxo OAuth, mapeamento de categorias, lógica de paginação de produtos, os 3 webhooks LGPD (obrigatórios para homologação do app), e os componentes de UI do `artifacts/catalogo`.

### 2.3 Comparação e estratégia de fusão

| Área | Melhor origem | Motivo |
|---|---|---|
| UX/estrutura de página (home, categorias, carrinho) | `thymos-fit` | Mais completo e já modelado nas referências (Lululemon/Alo) |
| Design system / tokens | **Novo** (manual da marca) | Nenhum dos dois repositórios usa a identidade oficial |
| Lógica de integração Nuvemshop (OAuth, sync, push) | `dashbosrd/api/*.js` | Único código funcional de integração real |
| Estrutura de servidor (rotas, camadas) | `dashbosrd/artifacts/api-server` | Melhor separação em `routes/`, `middlewares/`, `lib/`, TypeScript |
| Componentes de UI do painel | `dashbosrd/artifacts/catalogo` (shadcn/Radix) | Acessibilidade e consistência superiores ao app React solto |
| Persistência | Supabase (mantido) | Já usado nos dois lados do fluxo Nuvemshop existente |

## 3. Arquitetura proposta

```
JARVES/
├── apps/
│   ├── storefront/     # loja pública (evolução do thymos-fit, rebranded)
│   ├── admin/          # painel administrativo (Vite+React+Tailwind+shadcn)
│   └── api/            # servidor Node/Express/TS — OAuth, sync, webhooks
├── packages/
│   ├── tokens/         # design tokens (cores, tipografia, spacing...) — fonte única
│   └── nuvemshop-sdk/  # cliente Nuvemshop tipado, reusado por api e admin
├── docs/                # documentação técnica (API, deploy, troubleshooting)
├── .github/workflows/   # CI
├── .env.example
└── *.md (README, planos, relatórios)
```

Motivo: reaproveitamento máximo (SDK e tokens compartilhados evitam duplicação entre admin/API/storefront), modular, escalável — cada app pode ser deployado independentemente (storefront em CDN/Nuvemshop, admin em Vercel/Railway, API em Railway/servidor Node).

## 4. Funcionalidades — existentes vs. faltantes

**Existente (reaproveitado):** OAuth Nuvemshop, sync de produtos, push de produtos, status de conexão, webhooks LGPD, UX de storefront completa.

**Faltante (implementado nesta consolidação):**
- Validação HMAC de webhooks + deduplicação por `event_id`/hash.
- Cliente HTTP com retry/backoff e respeito a rate limit.
- Rebranding completo (tokens, tipografia, logo, imagens).
- Sincronização de pedidos e clientes (só produtos existia).
- Painel: dashboard de status, logs de sincronização/erros, configurações.
- Testes automatizados e CI.
- Documentação (README, deploy, troubleshooting, API).

## 5. Prioridades

1. Segurança (webhooks, segredos, `.env`).
2. SDK Nuvemshop compartilhado e testado.
3. Rebranding (tokens + storefront).
4. Painel administrativo consolidado.
5. CI/testes.
6. Documentação e relatório final.

## 6. Riscos

- **Sem acesso de rede real à API da Nuvemshop nem à conta da loja** neste ambiente de execução — todo o código é implementado e testado com mocks/contratos oficiais da API; a validação end-to-end com credenciais reais (`NUVEMSHOP_APP_SECRET`, primeiro login OAuth) fica pendente do proprietário.
- Documentação pública da Nuvemshop ficou parcialmente indisponível durante a pesquisa (503); os dados usados (headers de rate limit, header de assinatura `x-linkedstore-hmac-sha256`, política de retry de webhooks) foram confirmados via múltiplas fontes/cache de busca.
- Banco de dados (Supabase) mantido como está — trocar de banco é fora de escopo sem indicação explícita do proprietário.

## 7. Plano de migração

1. Criar estrutura de pastas e mover código com o mínimo de reescrita.
2. Extrair tokens da marca para `packages/tokens`.
3. Extrair lógica Nuvemshop para `packages/nuvemshop-sdk` (testada).
4. Reescrever `apps/api` sobre o SDK (Express/TS), incluindo validação de webhook.
5. Portar `apps/storefront` do `thymos-fit`, aplicando os tokens novos.
6. Consolidar `apps/admin` a partir de `dashbosrd` + melhores componentes de `artifacts/catalogo`.
7. CI, testes, documentação, relatório final.

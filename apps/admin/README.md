# @thymos/admin

Painel administrativo do e-commerce Thymos. React + Vite + Tailwind,
consumindo `apps/api` (nunca fala diretamente com a Nuvemshop ou com
segredos — tudo passa pelo backend).

## Páginas (conforme FASE 5 do briefing)

- **Dashboard** — status da API, da integração Nuvemshop e do Supabase;
  próximos passos sugeridos quando algo está pendente.
- **Integrações** — conectar/desconectar a loja Nuvemshop, disparar
  sincronização manual de produtos, ver resultado (total/sincronizados/falhas).
- **Logs** — eventos recentes (sync, oauth, webhook, admin) vindos de
  `GET /nuvemshop/logs`. Nunca exibe tokens ou segredos.
- **Configurações** — URL da API e a chave de admin, salvas **apenas** no
  `localStorage` do navegador (nunca no bundle, nunca em outro lugar).

## Por que não usar shadcn/Radix como o protótipo original?

O `dashbosrd` original tinha 3 sub-projetos parcialmente sobrepostos
(`artifacts/catalogo` com shadcn/Radix completo, `artifacts/api-server`
incompleto, `artifacts/mockup-sandbox`) que nunca chegaram a ser integrados
ao app principal. Em vez de arrastar essa dependência pesada e parcialmente
usada, este painel usa átomos de UI simples (`src/components/ui.jsx`)
estilizados diretamente com os tokens da marca — menos JS enviado ao
navegador, sem sacrificar consistência visual (ver FASE 9: evitar
dependências desnecessárias).

## Rodando localmente

```bash
cp ../../.env.example .env  # preencha VITE_API_BASE_URL
npm install
npm run dev   # http://localhost:5173
```

Ao abrir pela primeira vez, vá em **Configurações** e informe a URL de
`apps/api` e a chave de admin (mesmo valor de `SESSION_SECRET` do backend).

## Pendências conhecidas

- Sem autenticação de usuário própria (login) — o painel confia inteiramente
  na chave de admin da API. Para múltiplos operadores com permissões
  diferentes, adicionar autenticação real (ex.: Supabase Auth) é o próximo
  passo natural.
- Catálogo de produtos "próprio" (fora da Nuvemshop) do `dashbosrd` original
  (Supabase + CRUD de produtos) não foi portado neste MVP — o foco foi
  fechar o ciclo de integração Nuvemshop de ponta a ponta primeiro. Ver
  FINAL_REPORT.md.

# @thymos/storefront

Loja pública da Thymos. HTML/CSS/JS estático (sem framework, sem build
step), evoluído a partir do protótipo `thymos-fit`, com o design system
substituído pela identidade oficial da marca.

## O que foi corrigido em relação ao protótipo original

O `thymos-fit` original tinha um bug real: o CSS (`style.css`, tema v4)
usava uma convenção de nomes de classe (`.prod-card`, `.prod-modal`,
`.ci-*`...) diferente da que o `script.js` gerava dinamicamente
(`.product-card`, `.product-modal`, `.cart-item-*`...) — ou seja, cards de
produto, modal de produto e itens do carrinho eram injetados no DOM **sem
receber nenhum estilo**. Esta consolidação alinhou `script.js` às classes
reais do CSS (ver `git log` desta pasta) e adicionou testes visuais manuais.

## Rebranding aplicado

- Paleta: nude/bege → verde floresta `#324d3e` / sálvia `#728a6e` /
  verde-claro `#d9e4d7` (oficial, ver `packages/tokens`). Todas as cores
  "placeholder" de fotografia ainda não carregada foram retintadas para a
  família verde da marca; cores funcionais (erro/sucesso) e as cores reais
  de variantes de produto (colorways) foram preservadas.
- Tipografia: Montserrat + Cormorant Garamond → **Comfortaa** (corpo/wordmark)
  + **Bebas Neue** (display, mantida — já estava correta).
  `--font-serif` (usado nos acentos em itálico) aponta para Comfortaa, pois
  o manual da marca não define uma serifada.
- Logotipo: wordmark em texto (`thymos`, Comfortaa) — não usa arquivo de
  imagem, aplicando exatamente a mesma solução do manual da marca (a "logo"
  oficial é tipográfica, não um símbolo).
- Fotografia real do produto (`assets/products/`) usada no hero, split
  section, lifestyle banner e grid de categorias; produtos sem foto ainda
  usam gradientes decorativos na paleta da marca.

## Estrutura

```
index.html        # página única (hero, categorias, produtos, coleção, sobre, depoimentos, carrinho)
style.css         # estilos, importa packages/tokens/css/tokens.css
script.js         # catálogo mock, carrinho, modal de produto, popup, newsletter
tokens/tokens.css # cópia sincronizada de packages/tokens (rode `npm run sync-tokens` após mudar tokens)
assets/products/  # fotografia de produto real
robots.txt, sitemap.xml
```

## Rodando localmente

Qualquer servidor estático funciona:

```bash
npx serve .
# ou
npm run dev
```

## Pendências conhecidas (ver FINAL_REPORT.md)

- **Catálogo**: os produtos em `script.js` são dados de exemplo. A troca
  pelo catálogo real da Nuvemshop requer buscar `GET /nuvemshop/sync/products`
  (`apps/api`) e renderizar a partir da resposta — hoje ainda estático para
  o MVP funcionar sem depender da loja já estar conectada.
- **Checkout**: o botão "Finalizar Compra" aponta para o checkout
  hospedado da Nuvemshop assim que `window.THYMOS_CONFIG.nuvemshopStoreDomain`
  for preenchido com o domínio da loja conectada (não reimplementamos
  pagamento/frete — a Nuvemshop já resolve isso).
  Enquanto vazio, mostra uma mensagem clara em vez de simular um checkout.
- **Página de categoria dedicada** (`/loja`, filtros, paginação): o nav
  atualmente aponta para `#products` na mesma página; uma PLP completa é
  a evolução natural quando o catálogo vier da API real.

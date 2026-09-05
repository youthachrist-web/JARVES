# @thymos/tokens

Fonte única de verdade para o design system da Thymos, extraída do **Manual da
Marca** oficial (2025). Nenhum valor de cor, fonte ou espaçamento deve ser
escrito diretamente em `apps/*` — sempre referenciar os tokens daqui.

## Conteúdo

- `colors.json` — paleta primária (`#324d3e` floresta, `#728a6e` sálvia,
  `#d9e4d7` verde-claro), secundária (`#5c3d2e`, `#c4a882`, `#8ea48b`,
  `#e2ddd4`) e tokens semânticos (`background`, `text-primary`, `accent`, ...).
- `typography.json` — famílias **Comfortaa** (corpo/wordmark) e **Bebas Neue**
  (display), pesos e escala tipográfica.
- `spacing.json`, `radius.json`, `shadows.json`, `breakpoints.json`.
- `css/tokens.css` — **gerado automaticamente** a partir dos JSONs acima, para
  consumo direto por `apps/storefront` (CSS puro) via `<link>` ou `@import`.

## Regenerar o CSS

```bash
node packages/tokens/build-css.mjs
```

## Uso em React/TS (`apps/admin`)

```ts
import tokens from '@thymos/tokens'
tokens.colors.brand.primary.forest.value // "#324d3e"
```

## Uso no storefront estático

```html
<link rel="stylesheet" href="/tokens/tokens.css" />
<!-- ou @import '../../packages/tokens/css/tokens.css'; no CSS de build -->
```

## Por que não usar Tailwind config direto como fonte?

Tailwind (`apps/admin`) e o CSS puro (`apps/storefront`) consomem os mesmos
JSONs, cada um com seu adaptador (`tailwind.config.js` importa `colors.json`;
o storefront usa o `tokens.css` gerado). Isso evita duplicar valores de cor em
dois lugares diferentes — o manual da marca é a única fonte.

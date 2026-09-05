import colors from '../../packages/tokens/colors.json' with { type: 'json' }
import typography from '../../packages/tokens/typography.json' with { type: 'json' }
import radius from '../../packages/tokens/radius.json' with { type: 'json' }

// Achata os tokens de cor (brand.primary.forest.value -> "forest": "#324d3e")
// para o formato que o Tailwind espera, mantendo os mesmos nomes usados em
// packages/tokens/colors.json — nenhuma cor é redefinida aqui, apenas
// remapeada de formato. Resolve referências "{a.b.c}" (usadas em
// colors.json > semantic > *) do mesmo jeito que build-css.mjs, para que
// tokens semânticos não literais (ex.: semantic.accent -> {brand.primary.sage})
// também funcionem como classes Tailwind, não só os valores hex diretos.
function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function resolveValue(value, root) {
  if (typeof value !== 'string') return value
  const match = value.match(/^\{(.+)\}$/)
  if (!match) return value
  const resolved = getByPath(root, match[1])
  if (resolved == null) throw new Error(`Token reference not found: ${value}`)
  return resolveValue(resolved.value ?? resolved, root)
}

function flattenColors(node, root) {
  const out = {}
  for (const [key, value] of Object.entries(node)) {
    if (value && typeof value === 'object' && 'value' in value) {
      out[key] = resolveValue(value.value, root)
    } else if (value && typeof value === 'object') {
      out[key] = flattenColors(value, root)
    }
  }
  return out
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: flattenColors(colors.brand, colors),
        neutral: flattenColors(colors.neutral, colors),
        semantic: flattenColors(colors.semantic, colors),
      },
      fontFamily: {
        display: typography.families.display.value.split(',').map((f) => f.trim().replace(/'/g, '')),
        body: typography.families.body.value.split(',').map((f) => f.trim().replace(/'/g, '')),
      },
      borderRadius: {
        thymos: radius.md,
      },
    },
  },
  plugins: [],
}

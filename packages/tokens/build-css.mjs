#!/usr/bin/env node
/**
 * Gera css/tokens.css a partir dos arquivos JSON de tokens (colors, typography,
 * spacing, radius, shadows, breakpoints). Resolve referências `{a.b.c}` entre
 * tokens (usadas em colors.json > semantic > *).
 *
 * Uso: node build-css.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const read = (name) => JSON.parse(readFileSync(join(here, name), 'utf8'))

const colors = read('colors.json')
const typography = read('typography.json')
const spacing = read('spacing.json')
const radius = read('radius.json')
const shadows = read('shadows.json')
const breakpoints = read('breakpoints.json')

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

const lines = []
lines.push('/* ═══════════════════════════════════════════════════════')
lines.push('   THYMOS — Design Tokens (gerado automaticamente)')
lines.push('   Fonte: packages/tokens/*.json — NÃO editar este arquivo à mão.')
lines.push('   Regenerar com: node packages/tokens/build-css.mjs')
lines.push('   ═══════════════════════════════════════════════════════ */')
lines.push(':root {')

function emitGroup(groupName, group, root) {
  lines.push(`  /* ${groupName} */`)
  for (const [key, entry] of Object.entries(group)) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry) && !('value' in entry)) {
      emitGroup(`${groupName}.${key}`, entry, root)
      continue
    }
    const raw = entry && typeof entry === 'object' && 'value' in entry ? entry.value : entry
    const value = resolveValue(raw, root)
    lines.push(`  --color-${groupName.replace(/\./g, '-')}-${key}: ${value};`)
  }
}

emitGroup('brand-primary', colors.brand.primary, colors)
emitGroup('brand-secondary', colors.brand.secondary, colors)
lines.push(`  --color-brand-cream: ${resolveValue(colors.brand.cream.value, colors)};`)
emitGroup('neutral', colors.neutral, colors)
emitGroup('semantic', colors.semantic, colors)

lines.push('')
lines.push('  /* typography */')
lines.push(`  --font-display: ${typography.families.display.value};`)
lines.push(`  --font-body: ${typography.families.body.value};`)
for (const [key, w] of Object.entries(typography.weights)) {
  lines.push(`  --font-weight-${key}: ${w};`)
}
for (const [key, t] of Object.entries(typography.scale)) {
  lines.push(`  --text-${key}-size: ${t.size};`)
  lines.push(`  --text-${key}-line-height: ${t.lineHeight};`)
  if (t.letterSpacing) lines.push(`  --text-${key}-tracking: ${t.letterSpacing};`)
}

lines.push('')
lines.push('  /* spacing */')
for (const [key, v] of Object.entries(spacing)) {
  lines.push(`  --space-${key}: ${v};`)
}

lines.push('')
lines.push('  /* radius */')
for (const [key, v] of Object.entries(radius)) {
  lines.push(`  --radius-${key}: ${v};`)
}

lines.push('')
lines.push('  /* shadows */')
for (const [key, v] of Object.entries(shadows)) {
  lines.push(`  --shadow-${key}: ${v};`)
}

lines.push('}')
lines.push('')
lines.push('/* breakpoints (referência — usar em @media diretamente, CSS não suporta var() em media queries) */')
lines.push('/*')
for (const [key, v] of Object.entries(breakpoints)) {
  lines.push(` * ${key}: ${v}`)
}
lines.push(' */')
lines.push('')

const outDir = join(here, 'css')
mkdirSync(outDir, { recursive: true })
writeFileSync(join(outDir, 'tokens.css'), lines.join('\n') + '\n')
console.log('✓ packages/tokens/css/tokens.css gerado')

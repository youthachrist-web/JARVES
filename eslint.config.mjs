// Configuração única de lint para todo o monorepo (apps/* + packages/*).
// Mantida deliberadamente simples: regras recomendadas do ESLint/TS/React,
// sem plugins extras de estilo (prettier cuida de formatação separadamente
// se o time optar por adicioná-lo depois).
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.replit-artifact/**',
      'apps/storefront/tokens/**', // arquivo gerado, ver packages/tokens
      'packages/tokens/css/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['**/*.{jsx}'],
    plugins: { react },
    rules: {
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // React 17+ JSX transform
      'react/prop-types': 'off', // JSX sem TS neste MVP — sem checagem de props
    },
    settings: { react: { version: 'detect' } },
  },
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, ...globals.es2022 },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Arquivos JS puros: usa a regra base (TS não entende parameter
    // properties como `constructor(private x: T)`, então a versão
    // @typescript-eslint fica restrita aos arquivos .ts/.tsx abaixo).
    files: ['**/*.{js,jsx,mjs}'],
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  }
)

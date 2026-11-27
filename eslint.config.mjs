import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'

export default defineConfig([
  globalIgnores(['dist/**', 'node_modules/**']),
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
  },
  {
    files: ['src/**/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
])

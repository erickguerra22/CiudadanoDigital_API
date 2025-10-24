import globals from 'globals'
import { defineConfig } from 'eslint/config'
import eslint from '@eslint/js'
import importPlugin from 'eslint-plugin-import'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default defineConfig([
  eslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    ignores: ['node_modules/**', 'dist/**', 'eslint.config.js'],
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
      'import/no-unresolved': [
        'error',
        {
          ignore: ['^uuid$'],
        },
      ],

      'prettier/prettier': ['error'],
      'no-underscore-dangle': 'warn',
      semi: ['error', 'never'],
      'max-len': ['warn', { code: 200, ignoreComments: true }],
      'no-console': 'warn',
      'import/no-extraneous-dependencies': 'error',
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    },
  },
])

import js from '@eslint/js'
import globals from 'globals'

export default [
  {
    ignores: ['dist/**', 'android/**', 'node_modules/**']
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // Loaded via CDN / Capacitor / bundled UMD globals
        Capacitor: 'readonly',
        lucide: 'readonly',
        Chart: 'readonly',
        XLSX: 'readonly',
        Html5Qrcode: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
      'no-empty': ['warn', { allowEmptyCatch: true }]
    }
  }
]

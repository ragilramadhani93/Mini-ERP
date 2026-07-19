import globals from 'globals'

export default [
  {
    ignores: ['dist/**', 'android/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        Capacitor: 'readonly',
      },
    },
    rules: {
      // Best practices
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-undef': 'error',
      'prefer-const': 'warn',
      'no-var': 'error',

      // Style — minimal, the codebase uses its own conventions
      'eqeqeq': ['warn', 'always'],
      'curly': ['warn', 'all'],
      'no-throw-literal': 'warn',
      'prefer-template': 'warn',

      // Allow specific patterns used in the codebase
      'no-prototype-builtins': 'off',
    },
  },
  {
    files: ['src/**/*.html'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['src/**/__tests__/**', 'src/**/*.test.js', 'src/test-setup.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
        renderHTML: 'readonly',
        cleanupDOM: 'readonly',
        createMockAuth: 'readonly',
        createMockRouter: 'readonly',
        createMockSupabase: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
]

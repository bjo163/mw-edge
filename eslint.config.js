export default [
  {
    ignores: ['node_modules/**', '.wrangler/**']
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        crypto: 'readonly',
        Request: 'readonly',
        TextEncoder: 'readonly'
      }
    },
    rules: {
      'no-constant-binary-expression': 'error',
      'no-redeclare': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error'
    }
  }
]

const path = require('path');
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['taxtips-guardrails'],
  settings: {},
  overrides: [
    {
      // Apply the guardrail to code only. YAML is where tax values belong.
      files: ['tools/**/*.ts', 'tools/**/*.js', 'services/**/*.ts', 'tax-engine/**/*.ts'],
      excludedFiles: ['**/*.test.ts', 'tools/eslint-rules/**'],
      rules: {
        'taxtips-guardrails/no-tax-content-in-code': 'error',
      },
    },
  ],
};

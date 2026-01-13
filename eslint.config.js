// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      'import/no-unresolved': 'off',
      'import/extensions': 'off',
      'import/no-duplicates': 'off',
      'no-duplicate-imports': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': 'off',
    },
    ignores: [
      'dist/*',
      '.expo/*',
      'node_modules/*',
      'android/*',
      'ios/*'
    ],
  },
]);

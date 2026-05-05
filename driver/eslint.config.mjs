import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const tsParserOptions = {
  ecmaVersion: 'latest',
  sourceType: 'module',
  ecmaFeatures: { jsx: true },
};

const expoRnGlobals = {
  __DEV__: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  process: 'readonly',
  RequestInit: 'readonly',
  Response: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  URLSearchParams: 'readonly',
};

const tsRules = {
  ...tsPlugin.configs.recommended.rules,
  'no-redeclare': 'off',
  'no-unused-vars': 'off',
  '@typescript-eslint/no-redeclare': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    },
  ],
};

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: tsParserOptions,
      globals: expoRnGlobals,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: tsRules,
  },
];

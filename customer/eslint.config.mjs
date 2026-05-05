import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const tsParserOptions = {
  ecmaVersion: 'latest',
  sourceType: 'module',
  ecmaFeatures: { jsx: true },
};

/** Expo / React Native runtime (и общие web-ish API в RN). */
const expoRnGlobals = {
  console: 'readonly',
  fetch: 'readonly',
  RequestInit: 'readonly',
  Response: 'readonly',
  URLSearchParams: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  process: 'readonly',
  __DEV__: 'readonly',
};

const jestGlobals = {
  jest: 'readonly',
  describe: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  afterEach: 'readonly',
  beforeEach: 'readonly',
  global: 'readonly',
};

const tsRules = {
  ...tsPlugin.configs.recommended.rules,

  // отключаем обычные JS правила
  'no-unused-vars': 'off',
  'no-redeclare': 'off',

  // включаем TS правила
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    },
  ],

  '@typescript-eslint/no-redeclare': 'error',
};

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
    languageOptions: {
      parser: tsParser,
      parserOptions: tsParserOptions,
      globals: expoRnGlobals,
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: tsRules,
  },
  {
    files: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/__tests__/**/*.ts',
      'src/**/__tests__/**/*.tsx',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: tsParserOptions,
      globals: { ...expoRnGlobals, ...jestGlobals },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: tsRules,
  },
];

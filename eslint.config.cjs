const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const angularPlugin = require('@angular-eslint/eslint-plugin');
const angularTemplatePlugin = require('@angular-eslint/eslint-plugin-template');
const angularTemplateParser = require('@angular-eslint/template-parser');
const sonarjs = require('eslint-plugin-sonarjs');

module.exports = [
  {
    ignores: [
      '.angular/**',
      'dist/**',
      'node_modules/**',
      'src/assets/**',
      'coverage/**',
    ],
  },
  {
    ...js.configs.recommended,
    files: ['src/**/*.ts'],
  },
  ...tsPlugin.configs['flat/recommended'].map((config) => ({
    ...config,
    files: ['src/**/*.ts'],
  })),
  {
    ...sonarjs.configs.recommended,
    files: ['src/**/*.ts'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@angular-eslint': angularPlugin,
      '@typescript-eslint': tsPlugin,
      '@angular-eslint/template': angularTemplatePlugin,
    },
    processor: angularTemplatePlugin.processors['extract-inline-html'],
    rules: {
      ...angularPlugin.configs.recommended.rules,
      '@angular-eslint/prefer-inject': 'off',
      '@angular-eslint/prefer-standalone': 'off',
      '@angular-eslint/no-empty-lifecycle-method': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      'no-console': 'off',
    },
  },
  {
    files: ['src/**/*.html'],
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: {
      '@angular-eslint/template': angularTemplatePlugin,
    },
    rules: {
      ...angularTemplatePlugin.configs.recommended.rules,
      ...angularTemplatePlugin.configs.accessibility.rules,
      '@angular-eslint/template/prefer-control-flow': 'off',
      '@angular-eslint/template/no-autofocus': 'warn',
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
    },
  },
];

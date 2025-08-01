import eslint from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import prettierConfig from 'eslint-config-prettier';
import jestDom from 'eslint-plugin-jest-dom';
import prettier from 'eslint-plugin-prettier/recommended';
import pluginReact from 'eslint-plugin-react';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tailwind from 'eslint-plugin-tailwindcss';
import pluginQuery from '@tanstack/eslint-plugin-query';
import testingLibrary from 'eslint-plugin-testing-library';
import globals from 'globals';
import tsEslint from 'typescript-eslint';

export default [
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  { languageOptions: { globals: globals.browser } },
  ...pluginQuery.configs['flat/recommended'],
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  prettier,
  prettierConfig,
  {
    ...pluginReact.configs.flat.recommended,
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  ...tailwind.configs['flat/recommended'],
  {
    settings: {
      tailwindcss: {
        whitelist: ['waveform', 'timeline', 'minimap', 'success', 'warning', 'destructive'],
      },
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  {
    files: ['**/*.test.ts?(x)'],
    ...testingLibrary.configs['flat/react'],
    ...jestDom.configs['flat/recommended'],
  },
  {
    ignores: [
      'node_modules',
      '.next',
      '.freestyle',
      'dist',
      'build',
      'coverage',
      'public',
      '.env',
      '.env.local',
      '.env.development',
      '.env.test',
      '.env.production',
      'package-lock.json',
      'tsconfig.json',
      'tsconfig.*.json',
      'next.config.js',
      'next.config.mjs',
      'next-env.d.ts',
    ],
  },
  {
    rules: {
      'prettier/prettier': ['error'],

      'import/order': 'off', // Avoid conflicts with `simple-import-sort` plugin
      'sort-imports': 'off', // Avoid conflicts with `simple-import-sort` plugin

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',

      // General JS/ES rules
      'no-irregular-whitespace': 'error',
      'no-unexpected-multiline': 'error',
      curly: ['error', 'multi-line'],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'arrow-body-style': ['error', 'always'],
      'no-mixed-spaces-and-tabs': 'error',
      'comma-dangle': ['error', 'always-multiline'],
      'no-multi-spaces': 'error',
      'block-spacing': ['error', 'never'],
      camelcase: ['error', { properties: 'never' }],
      'no-trailing-spaces': 'error',
      'spaced-comment': ['error', 'always'],
      eqeqeq: ['error', 'always'],
      'no-empty-function': 'error',
      'no-param-reassign': 'error',
      'no-use-before-define': ['error', { functions: false, classes: true }],
      'no-duplicate-imports': 'error',
      'no-constant-condition': 'warn',
      'no-useless-catch': 'error',
      'no-fallthrough': 'error',
      'no-nested-ternary': 'error',
      'no-new': 'error',
      'no-return-await': 'error',
      'prefer-template': 'error',
      'no-unneeded-ternary': 'error',

      // React-specific rules
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/no-children-prop': 'error',
      'react/no-danger': 'error',
      'react/self-closing-comp': 'error',
      'react/prop-types': 'off',
      'react/no-unknown-property': 'off',

      '@next/next/no-duplicate-head': 'off',
    },
  },
];

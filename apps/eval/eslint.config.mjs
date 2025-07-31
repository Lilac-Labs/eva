import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettier from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tsEslint from 'typescript-eslint';
import tseParser from '@typescript-eslint/parser';

/** @type {import("eslint").Linter.Config} */
export default [
	{ files: ['**/*.{js,mjs,cjs,ts}'] },
	{
		languageOptions: {
			globals: globals.browser,
			parser: tseParser,
			parserOptions: {
				project: true, // This will be overridden by individual configs
			},
		},
	},
	eslint.configs.recommended,
	...tsEslint.configs.recommendedTypeChecked,
	prettier,
	prettierConfig,
	{
		plugins: {
			'simple-import-sort': simpleImportSort,
		},
		rules: {
			'simple-import-sort/imports': ['error'], // Try as array
			'simple-import-sort/exports': ['error'],
		},
	},
	{
		ignores: [
			'node_modules/',
			'dist/',
			'tests/',
			'test/',
			'build/',
			'coverage/',
			'logs/',
			'*.d.ts',
			'public/',
			'.cache/',
			'out/',
			'static/',
			'vendor/',
			'package-lock.json',
			'.env',
			'.env.*',
			'*.log',
			'*.config.js',
		],
	},
	{
		rules: {
			/* Prettier */
			'prettier/prettier': 'error',

			/* General JS/ES Rules */
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
			'no-empty-function': 'off',
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

			/* Node.js Rules */
			'handle-callback-err': 'error',
			'no-path-concat': 'error',
			'global-require': 'error',

			'no-undef': 'off',
			'no-empty': 'off',

			/* TypeScript Rules */
			'@typescript-eslint/explicit-function-return-type': [
				'error',
				{
					allowExpressions: false,
					allowTypedFunctionExpressions: false,
					allowHigherOrderFunctions: false,
					allowDirectConstAssertionInArrowFunctions: true,
					allowConciseArrowFunctionExpressionsStartingWithVoid: false,
				},
			],
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/restrict-template-expressions': 'error',
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/strict-boolean-expressions': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/prefer-optional-chain': 'error',
			'@typescript-eslint/prefer-nullish-coalescing': 'error',
			'@typescript-eslint/prefer-ts-expect-error': 'error',
			'@typescript-eslint/no-unnecessary-type-assertion': 'error',
			'@typescript-eslint/no-inferrable-types': 'error',
			'@typescript-eslint/consistent-type-definitions': 'error',
			'@typescript-eslint/prefer-readonly': 'error',
			'@typescript-eslint/no-unsafe-call': 'error',

			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/ban-types': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-empty-interface': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-redundant-type-constituents': 'off',

			'no-mixed-spaces-and-tabs': 'off',
		},
	},
	{
		ignores: ['*.mjs'],
	},
	{
		languageOptions: {
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		ignores: ['eslint.config.mjs'],
	},
];
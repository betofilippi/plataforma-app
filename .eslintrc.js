module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
    'import',
    'security',
  ],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-const': 'error',
    '@typescript-eslint/no-var-requires': 'error',
    
    // Import rules
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-unresolved': 'error',
    'import/no-duplicates': 'error',
    
    // Security rules
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    
    // General rules
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': 'error',
    'arrow-spacing': 'error',
    'comma-dangle': ['error', 'always-multiline'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'never'],
    'indent': ['error', 2, { SwitchCase: 1 }],
    'max-len': ['error', { code: 120, ignoreUrls: true }],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
  },
  overrides: [
    // Backend specific rules
    {
      files: ['backend/**/*.ts'],
      env: {
        node: true,
      },
      rules: {
        'no-console': 'off', // Permitir console.log no backend para logging
      },
    },
    // Frontend specific rules  
    {
      files: ['frontend/**/*.ts', 'frontend/**/*.tsx'],
      env: {
        browser: true,
        es6: true,
      },
      extends: [
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
      ],
      plugins: ['react', 'react-hooks', 'jsx-a11y'],
      rules: {
        'react/react-in-jsx-scope': 'off', // Next.js não precisa importar React
        'react/prop-types': 'off', // Usando TypeScript
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        'jsx-a11y/anchor-is-valid': 'off', // Next.js Link component
      },
      settings: {
        react: {
          version: 'detect',
        },
      },
    },
    // Test files
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        jest: true,
      },
      extends: ['plugin:jest/recommended'],
      plugins: ['jest'],
      rules: {
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'jest/prefer-to-have-length': 'warn',
        'jest/valid-expect': 'error',
      },
    },
    // Shared library
    {
      files: ['shared/**/*.ts'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
    // Integration files
    {
      files: ['integrations/**/*.ts'],
      rules: {
        'no-console': 'off', // Permitir logs em integrações
        '@typescript-eslint/no-explicit-any': 'warn', // APIs externas podem ter any
      },
    },
  ],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: [
          './tsconfig.json',
          './backend/tsconfig.json',
          './frontend/tsconfig.json',
          './shared/tsconfig.json',
          './integrations/tsconfig.json',
        ],
      },
    },
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.next/',
    'coverage/',
    '*.js',
    '*.d.ts',
  ],
}
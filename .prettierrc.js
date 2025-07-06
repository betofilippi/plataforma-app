module.exports = {
  // Configurações básicas
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  
  // Configurações específicas para diferentes tipos de arquivo
  overrides: [
    {
      files: '*.{js,jsx,ts,tsx}',
      options: {
        singleQuote: true,
        semi: false,
        trailingComma: 'es5',
      },
    },
    {
      files: '*.{json,md,yml,yaml}',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
      },
    },
    {
      files: '*.{yml,yaml}',
      options: {
        singleQuote: false,
        bracketSpacing: false,
      },
    },
    {
      files: 'package.json',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.css',
      options: {
        singleQuote: false,
      },
    },
    {
      files: '*.scss',
      options: {
        singleQuote: true,
      },
    },
  ],
}
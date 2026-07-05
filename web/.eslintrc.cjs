module.exports = {
  root: true,
  ignorePatterns: ['**/.next/**', '**/node_modules/**', '**/dist/**'],
  overrides: [
    {
      files: ['apps/web/**/*.{js,jsx,ts,tsx}'],
      extends: ['next/core-web-vitals'],
      settings: {
        next: {
          rootDir: 'apps/web/',
        },
      },
    },
    {
      files: ['packages/**/*.{ts,tsx}'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      env: {
        browser: true,
        es2022: true,
        node: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};

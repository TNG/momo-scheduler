module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: ['plugin:prettier/recommended', 'plugin:jest/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.eslint.json',
    sourceType: 'module',
  },
  rules: {
    'comma-dangle': ['error', 'always-multiline'],
    'jest/expect-expect': [
      'error',
      {
        assertFunctionNames: ['expect*', 'verify'],
      },
    ],
    'prefer-const': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'off',
  },
  ignorePatterns: ['dist', 'tsconfig.json', 'tsconfig.eslint.json'],
};

const base = require('./base');

/** @type {import("eslint").Linter.Config} */
module.exports = {
  ...base,
  env: { node: true },
  rules: {
    ...base.rules,
    '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
    '@typescript-eslint/no-floating-promises': 'error',
  },
};

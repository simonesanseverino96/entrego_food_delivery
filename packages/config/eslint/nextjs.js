const base = require('./base');

/** @type {import("eslint").Linter.Config} */
module.exports = {
  ...base,
  extends: [...(base.extends ?? []), 'next/core-web-vitals'],
  rules: {
    ...base.rules,
  },
};

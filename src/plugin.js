/** @satisfies {import('eslint').ESLint.Plugin} */
const plugin = {
  rules: {
    'prefer-vi-mock-import-expression': require('./rules/prefer-vi-mock-import-expression'),
  },
}

module.exports = { plugin }

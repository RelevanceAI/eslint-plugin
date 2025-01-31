/** @satisfies {import('eslint').ESLint.Plugin} */
const plugin = {
  rules: {
    'prefer-vi-mock-import-expression': require('./rules/prefer-vi-mock-import-expression'),
    'no-vitest-and-expect-package': require('./rules/no-vitest-and-expect-package'),
  },
}

module.exports = { plugin }

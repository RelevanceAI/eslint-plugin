/** @satisfies {import('eslint').ESLint.Plugin} */
const plugin = {
  rules: {
    'prefer-vi-mock-import-expression': require('./rules/prefer-vi-mock-import-expression'),
    'no-vitest-and-expect-package': require('./rules/no-vitest-and-expect-package'),
    'prefer-function-as-describe-label': require('./rules/prefer-function-as-describe-label'),
    'pascal-case': require('./rules/pascal-case'),
  },
}

module.exports = { plugin }

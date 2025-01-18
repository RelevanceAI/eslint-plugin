/**
 * @type {import('eslint').Rule.RuleModule}
 */
const rule = {
  meta: {
    type: 'problem',
    hasSuggestions: true,
    fixable: 'code',
  },
  create: function create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'MemberExpression') {
          return
        }

        const isViMock =
          callee.object.type === 'Identifier' &&
          callee.object.name === 'vi' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'mock'
        if (!isViMock) {
          return
        }

        const firstArg = node.arguments[0]
        if (!firstArg) {
          return
        }

        if (firstArg.type !== 'Literal' || typeof firstArg.value !== 'string') {
          return
        }

        context.report({
          node,
          message: "Use import expressions when using 'vi.mock'",
          fix(fixer) {
            return [
              fixer.insertTextBefore(firstArg, 'import('),
              fixer.insertTextAfter(firstArg, ')'),
            ]
          },
        })
      },
    }
  },
}

module.exports = rule

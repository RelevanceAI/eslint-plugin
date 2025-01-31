/**
 * @type {import('eslint').Rule.RuleModule}
 */
const rule = {
  meta: {
    type: 'problem',
    hasSuggestions: false,
  },

  create: function create(context) {
    let hasVitestImport = false
    return {
      ImportDeclaration(node) {
        if (node.source.value === 'vitest') {
          hasVitestImport = true
        }
      },
      'ImportDeclaration:exit'(node) {
        if (node.source.value === 'expect' && hasVitestImport) {
          context.report({
            node,
            message: "Don't import from 'expect' when using 'vitest' ya dingus",
          })
        }
      },
    }
  },
}

module.exports = rule

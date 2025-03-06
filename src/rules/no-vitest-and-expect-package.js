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
    /**
     * @type {import('eslint').Rule.Node | null}
     */
    let expectImportNode = null
    return {
      'Program:exit'() {
        if (expectImportNode && hasVitestImport) {
          context.report({
            node: expectImportNode,
            message: "Don't import from 'expect' when using 'vitest' ya dingus",
          })
        }
      },
      ImportDeclaration(node) {
        if (node.source.value === 'vitest') {
          hasVitestImport = true
        }
      },
      'ImportDeclaration:exit'(node) {
        if (node.source.value === 'expect') {
          expectImportNode = node
        }
      },
    }
  },
}

module.exports = rule

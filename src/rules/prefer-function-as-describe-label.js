/**
 * @type {import('eslint').Rule.RuleModule}
 */
const rule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
  },
  create: function create(context) {
    const importedNames = /** @type {Set<string>} */ (new Set())

    return {
      ImportDeclaration(node) {
        for (const specifier of node.specifiers) {
          importedNames.add(specifier.local.name)
        }
      },
      'CallExpression:exit'(node) {
        if (
          node.callee.type !== 'Identifier' ||
          node.callee.name !== 'describe'
        ) {
          return
        }

        const firstArgNode = node.arguments[0]

        if (!firstArgNode) {
          return
        }

        if (firstArgNode.type === 'Literal') {
          if (typeof firstArgNode.value !== 'string') {
            return
          }

          const describeLabel = firstArgNode.value

          if (!importedNames.has(describeLabel)) {
            return
          }

          context.report({
            node: firstArgNode,
            message:
              "Prefer making the describe label the tested function, instead of the function's name",
            fix(fixer) {
              return [fixer.replaceText(firstArgNode, describeLabel)]
            },
          })
        } else if (firstArgNode.type === 'MemberExpression') {
          const isFirstArgFunctionNameProperty =
            firstArgNode.property.type === 'Identifier' &&
            firstArgNode.property.name === 'name'
          const functionName =
            firstArgNode.object.type === 'Identifier'
              ? firstArgNode.object.name
              : null

          if (
            !isFirstArgFunctionNameProperty ||
            !functionName ||
            !importedNames.has(functionName)
          ) {
            return
          }

          context.report({
            node: firstArgNode,
            message:
              "Prefer making the describe label the tested function, instead of the function's name property",
            fix(fixer) {
              return [fixer.replaceText(firstArgNode, functionName)]
            },
          })
        }
      },
    }
  },
}

module.exports = rule

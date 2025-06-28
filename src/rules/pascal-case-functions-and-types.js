/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'TODO',
    },
    schema: [],
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier') {
          return
        }

        const name = node.id.name

        if (node.init && isRHSFunction(node.init)) {
          checkAndReport(context, node, name)

          return
        }

        const sourceCode = context.sourceCode
        const scope = sourceCode.getScope(node.id)
        const variable = scope.variables.find((v) => v.name === name)

        if (!variable) {
          return
        }

        const isCalled = variable.references.some((r) => {
          const parent = r.identifier.parent
          return (
            parent.type === 'CallExpression' && parent.callee === r.identifier
          )
        })

        if (isCalled) {
          checkAndReport(context, node, name)
        }

        const isAssignedAFunction = variable.references.some((r) => {
          const parent = r.identifier.parent
          if (
            parent.type === 'AssignmentExpression' &&
            parent.left === r.identifier
          ) {
            if (isRHSFunction(parent.right)) {
              return true
            }
          }
        })

        if (isAssignedAFunction) {
          checkAndReport(context, node, name)
        }

        const hasKnownViTestFunctionMockCall = variable.references.some((r) => {
          const parent = r.identifier.parent
          if (
            parent.type === 'MemberExpression' &&
            !parent.computed &&
            parent.object === r.identifier &&
            (parent.property.name === 'mockResolvedValue' ||
              parent.property.name === 'mockResolvedValueOnce' ||
              parent.property.name === 'mockReturnValue' ||
              parent.property.name === 'mockReturnValueOnce')
          ) {
            const grandparent = parent.parent
            if (
              grandparent.type === 'CallExpression' &&
              grandparent.callee === parent
            ) {
              return true
            }
          }
        })

        if (hasKnownViTestFunctionMockCall) {
          checkAndReport(context, node, name)
        }
      },
    }
  },
}

/**
 * @param {import("estree").Expression} rhs
 */
function isRHSFunction(rhs) {
  if (
    rhs.type === 'ArrowFunctionExpression' ||
    rhs.type === 'FunctionExpression'
  ) {
    return true
  }

  if (
    rhs.type === 'MemberExpression' &&
    !rhs.computed &&
    rhs.property.type === "Identifier" &&
    
    isPascalCase(rhs.property.name)
  ) {
    return true
  }

  if (rhs.type === 'CallExpression') {
    let currentCall = rhs
    while (true) {
      if (
        currentCall.callee.type === 'MemberExpression' &&
        !currentCall.callee.computed
      ) {
        if (
          currentCall.callee.object.type === 'Identifier' &&
          currentCall.callee.object.name === 'vi' &&
          currentCall.callee.property.type === 'Identifier' &&
          currentCall.callee.property.name === 'mocked' &&
          currentCall.arguments.length === 1
        ) {
          if (
            currentCall.arguments[0]?.type === 'Identifier' &&
            isPascalCase(currentCall.arguments[0].name)
          ) {
            return true
          }

          const argument = currentCall.arguments[0]
          if (
            argument?.type === 'MemberExpression' &&
            !argument.computed &&
            argument.property.type === 'Identifier' &&
            isPascalCase(argument.property.name)
          ) {
            return true
          }
        }

        if (currentCall.callee.object.type === 'CallExpression') {
          currentCall = currentCall.callee.object
          continue
        }
      }

      break
    }
  }

  if (rhs.type === 'CallExpression') {
    let currentCall = rhs
    while (true) {
      if (
        currentCall.callee.type === 'MemberExpression' &&
        !currentCall.callee.computed
      ) {
        if (
          currentCall.callee.object.type === 'Identifier' &&
          currentCall.callee.object.name === 'vi' &&
          currentCall.callee.property.type === 'Identifier' &&
          currentCall.callee.property.name === 'fn' &&
          currentCall.arguments.length <= 1
        ) {
          return true
        }

        if (currentCall.callee.object.type === 'CallExpression') {
          currentCall = currentCall.callee.object
          continue
        }
      }

      break
    }
  }

  return false
}

/**
 * @param {string} name
 */
// https://github.com/typescript-eslint/typescript-eslint/blob/db32b8a82d58eddb29be207a5f4476644973abbf/packages/eslint-plugin/src/rules/naming-convention-utils/format.ts#L17
function isPascalCase(name) {
  return (
    name.length === 0 ||
    (name[0] === name[0]?.toUpperCase() && !name.includes('_'))
  )
}

/**
 * @param {import("eslint").Rule.RuleContext} context
 * @param {import("estree").Node} node
 * @param {string} name
 */
function checkAndReport(context, node, name) {
  if (!isPascalCase(name)) {
    context.report({
      node,
      message: `Function variable '${name}' must have PascalCase name`,
    })
  }
}

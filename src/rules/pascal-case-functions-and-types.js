/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',
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
              parent.property.name === 'mockReturnValueOnce' ||
              parent.property.name === 'mockImplementation')
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
    rhs.property.type === 'Identifier' &&
    isPascalCase(rhs.property.name)
  ) {
    return true
  }

  /**
   * @param {import("estree").CallExpression} call
   */
  function getLeftMostCall(call) {
    while (
      call.callee.type === 'MemberExpression' &&
      call.callee.object.type === 'CallExpression'
    ) {
      call = call.callee.object
    }
    return call
  }

  if (rhs.type === 'CallExpression') {
    const leftMostCall = getLeftMostCall(rhs)

    if (
      leftMostCall.callee.type === 'MemberExpression' &&
      !leftMostCall.callee.computed &&
      leftMostCall.callee.object.type === 'Identifier' &&
      leftMostCall.callee.object.name === 'vi' &&
      leftMostCall.callee.property.type === 'Identifier'
    ) {
      if (
        leftMostCall.callee.property.name === 'mocked' &&
        leftMostCall.arguments.length === 1
      ) {
        const argument = leftMostCall.arguments[0]

        if (argument?.type === 'Identifier' && isPascalCase(argument.name)) {
          return true
        }

        if (
          argument?.type === 'MemberExpression' &&
          !argument.computed &&
          argument.property.type === 'Identifier' &&
          isPascalCase(argument.property.name)
        ) {
          return true
        }
      }

      if (
        leftMostCall.callee.property.name === 'fn' &&
        leftMostCall.arguments.length <= 1
      ) {
        return true
      }
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

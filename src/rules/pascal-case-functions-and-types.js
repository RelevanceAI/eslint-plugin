/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: {
          knownFunctionFactories: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Names of function that are known to return functions.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    /**
     * @type {Set<string>|undefined}
     */
    let knownFunctionFactories

    const options = context.options[0]
    if (options) {
      knownFunctionFactories = new Set(options.knownFunctionFactories)
    }

    return {
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier') {
          if (node.init && isRHSFunction(node.init, knownFunctionFactories)) {
            const name = node.id.name
            checkAndReport(context, [node.id], name)

            return
          }
        }

        const sourceCode = context.sourceCode
        const variables = sourceCode.getDeclaredVariables(node)
        for (const variable of variables) {
          checkVariable(
            context,
            variable.name,
            variable.identifiers,
            variable.references,
            knownFunctionFactories,
          )
        }
      },
    }
  },
}

/**
 * @param {import("eslint").Rule.RuleContext} context
 * @param {string} name
 * @param {import("estree").Identifier[]} bindingIdentifiers
 * @param {import("eslint").Scope.Reference[]} references
 * @param {Set<string> | undefined} knownFunctionFactories
 */
function checkVariable(
  context,
  name,
  bindingIdentifiers,
  references,
  knownFunctionFactories,
) {
  const isCalled = references.some((r) => {
    const parent = r.identifier.parent
    return parent.type === 'CallExpression' && parent.callee === r.identifier
  })

  if (isCalled) {
    checkAndReport(context, bindingIdentifiers, name)
  }

  const isAssignedAFunction = references.some((r) => {
    const parent = r.identifier.parent
    if (
      parent.type === 'AssignmentExpression' &&
      parent.left === r.identifier
    ) {
      if (isRHSFunction(parent.right, knownFunctionFactories)) {
        return true
      }
    }
  })

  if (isAssignedAFunction) {
    checkAndReport(context, bindingIdentifiers, name)
  }

  // const something = vi.mocked(...);
  // something.mockImplementation(...);
  const hasKnownViTestFunctionMockCall = references.some((r) => {
    const parent = r.identifier.parent
    if (
      parent.type === 'MemberExpression' &&
      !parent.computed &&
      parent.object === r.identifier &&
      (parent.property.name === 'mockResolvedValue' ||
        parent.property.name === 'mockResolvedValueOnce' ||
        parent.property.name === 'mockReturnValue' ||
        parent.property.name === 'mockReturnValueOnce' ||
        parent.property.name === 'mockImplementation' ||
        parent.property.name === 'mockImplementationOnce' ||
        parent.property.name === 'mockRejectedValue' ||
        parent.property.name === 'mockRejectedValueOnce' ||
        parent.property.name === 'mockReturnThis')
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
    checkAndReport(context, bindingIdentifiers, name)
  }

  const usedInExpectToHaveBeenCalledTimes = references.some((r) => {
    const parent = r.identifier.parent
    if (
      parent.type === 'CallExpression' &&
      parent.callee.type === 'Identifier' &&
      parent.callee.name === 'expect' &&
      parent.arguments.length === 1 &&
      parent.arguments.includes(r.identifier)
    ) {
      const grandparent = parent.parent
      if (
        grandparent?.type === 'MemberExpression' &&
        grandparent.property.type === 'Identifier' &&
        (grandparent.property.name === 'toHaveBeenCalledTimes' ||
          grandparent.property.name === 'toHaveBeenCalledWith' ||
          grandparent.property.name === 'toHaveBeenCalledOnce')
      ) {
        const greatGrandParent = grandparent.parent
        if (
          greatGrandParent?.type === 'CallExpression' &&
          greatGrandParent.callee === grandparent
        ) {
          return true
        }
      }
    }
  })

  if (usedInExpectToHaveBeenCalledTimes) {
    checkAndReport(context, bindingIdentifiers, name)
  }
}

/**
 * @param {import("estree").Expression} rhs
 * @param {Set<string> | undefined} knownFunctionFactories
 */
function isRHSFunction(rhs, knownFunctionFactories) {
  if (
    rhs.type === 'ArrowFunctionExpression' ||
    rhs.type === 'FunctionExpression'
  ) {
    return true
  }

  if (
    rhs.type === 'CallExpression' &&
    rhs.callee.type === 'Identifier' &&
    knownFunctionFactories?.has(rhs.callee.name)
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
 * @param {import("estree").Identifier[]} bindingIdentifiers
 * @param {string} name
 */
function checkAndReport(context, bindingIdentifiers, name) {
  if (!isPascalCase(name)) {
    for (const bindingIdentifier of bindingIdentifiers) {
      context.report({
        node: bindingIdentifier,
        message: `Function variable '${name}' must have PascalCase name`,
      })
    }
  }
}

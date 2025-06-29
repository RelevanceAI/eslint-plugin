/*

This rule looks at each variable and tries to determine if it's a
function/callable. If it is, then the variable is expected to have a PascalCase
name.

The rule was written to replace @typescript-eslint/naming-convention for our
needs, since it was taking up about 25 seconds, or about 40%, of the time taken
to lint one of our repos.

This rule is faster because it doesn't need to use TypeScript to calculate the
type of every variable and check if it's a function - we just use syntactic
analysis and some hardcoded special cases based on the functions used in our
repo.

The hardcoded cases for Vitest are:
  - methods that are only called on mocked functions:
    - mockResolvedValue
    - mockResolvedValueOnce
    - mockReturnValue
    - mockReturnValueOnce
    - mockImplementation
    - mockImplementationOnce
    - mockRejectedValue
    - mockRejectedValueOnce
    - mockReturnThis
  - vi.fn()
  - vi.mocked().X() where X is one of the methods that are only called on mocked
    functions.
  - expect(foo).X(), where X is one of the methods that are only called on
    expect for functions:
    - toHaveBeenCalledTimes
    - toHaveBeenCalledWith
    - toHaveBeenCalledOnce

We use these values to infer that a variable is a function even we we don't see
a function being assigned to a variable.

The test for PascalCase is quite primitive/liberal (borrowed from
@typescript-eslint/naming-convention), and we intentionally don't generate fixes
for the naming violations, since that would require analysing which parts of a
variable are words/acronyms.

In the following cases, we use these definitions/meanings:
- RHS = right hand side = "the thing assigned to a variable".
- MemberExpression is property access, and we only consider non-computed
  MemberExpressions.

Assignment based cases:
Case 1: Variable has a function assigned to it, or is declared with a function
as the initial value.
  a. RHS is arrow function or function expression:
    const foo = () => {};
    const foo = function() {};

  b. RHS is a call to a known function factory (function that returns functions):
    const foo = KnownFunctionFactory();

  c. RHS is a MemberExpression and the property name is PascalCase (indicating
  that it's a function in our convention):
    const foo = someObject.SomeFunction;

  d. RHS is a CallExpression, optionally with member function calls chained onto
  it if the methods are known Vitest function mocking methods.
  The callee must be either:
    1. A MemberExpression of the form `vi.fn()`, with optionally one argument:
      const foo = vi.fn();
      const foo = vi.fn(() => {});
      const foo = vi.fn().mockResolvedValue().mockRejectedValue();

    2. A MemberExpression of the form `vi.mocked(args)`, where args is either
    a PascalCase identifier, or a MemberExpression with a PascalCase property:
      const foo = vi.mocked(SomeFunction);
      const foo = vi.mocked(obj.SomeFunction);

Usage based cases:
Case 2:
  a. The variable is called:
    const foo = blah; foo();
  b. The variable has a known Vitest function mocking method called on it:
    const foo = blah; foo.mockResolvedValue();
  c. The variable is passed as the sole argument to Vitest's `expect` function,
  which then has a known Vitest expect method for functions:
    const foo = blah; expect(foo).toHaveBeenCalledTimes();

*/

const KNOWN_VITEST_FUNCTION_MOCK_METHODS = new Set([
  'mockResolvedValue',
  'mockResolvedValueOnce',
  'mockReturnValue',
  'mockReturnValueOnce',
  'mockImplementation',
  'mockImplementationOnce',
  'mockRejectedValue',
  'mockRejectedValueOnce',
  'mockReturnThis',
])

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    docs: {
      description:
        'Ensure all variables that contain functions have PascalCase names.',
    },
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
        // Case 1. for declarations.
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
  // Case 2.a.
  const isCalled = references.some((r) => {
    const parent = r.identifier.parent
    return parent.type === 'CallExpression' && parent.callee === r.identifier
  })

  if (isCalled) {
    checkAndReport(context, bindingIdentifiers, name)
  }

  // Case 1. for assignments.
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

  // Case 2.b.
  const hasKnownViTestFunctionMockCall = references.some((r) => {
    const parent = r.identifier.parent
    if (
      parent.type === 'MemberExpression' &&
      !parent.computed &&
      parent.object === r.identifier &&
      KNOWN_VITEST_FUNCTION_MOCK_METHODS.has(parent.property.name)
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

  // Case 2.c.
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
  // Case 1.a.
  if (
    rhs.type === 'ArrowFunctionExpression' ||
    rhs.type === 'FunctionExpression'
  ) {
    return true
  }

  // Case 1.b.
  if (
    rhs.type === 'CallExpression' &&
    rhs.callee.type === 'Identifier' &&
    knownFunctionFactories?.has(rhs.callee.name)
  ) {
    return true
  }

  // Case 1.c.
  if (
    rhs.type === 'MemberExpression' &&
    !rhs.computed &&
    rhs.property.type === 'Identifier' &&
    isPascalCase(rhs.property.name)
  ) {
    return true
  }

  // Case 1.d.
  if (rhs.type === 'CallExpression') {
    const leftMostCall = getLeftMostCall(
      rhs,
      KNOWN_VITEST_FUNCTION_MOCK_METHODS,
    )

    if (
      leftMostCall.callee.type === 'MemberExpression' &&
      !leftMostCall.callee.computed &&
      leftMostCall.callee.object.type === 'Identifier' &&
      leftMostCall.callee.object.name === 'vi' &&
      leftMostCall.callee.property.type === 'Identifier'
    ) {
      // Case 1.d.1.
      if (
        leftMostCall.callee.property.name === 'fn' &&
        leftMostCall.arguments.length <= 1
      ) {
        return true
      }

      // Case 1.d.2.
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
    }
  }

  return false
}

/**
 * @param {import("estree").CallExpression} call
 * @param {Set<string>} allowedProperties
 */
function getLeftMostCall(call, allowedProperties) {
  while (
    call.callee.type === 'MemberExpression' &&
    call.callee.object.type === 'CallExpression' &&
    !call.callee.computed &&
    call.callee.property.type === 'Identifier' &&
    allowedProperties.has(call.callee.property.name)
  ) {
    call = call.callee.object
  }
  return call
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

const rule = require('./prefer-function-as-describe-label')
const { RuleTester } = require('eslint')
const { test } = require('node:test')

const ruleTester = new RuleTester()

test('prefer-function-as-describe-label', () => {
  ruleTester.run('prefer-function-as-describe-label', rule, {
    valid: [
      {
        code: `
import MyFunc from './path/to/my-func'
import { NamedFunc } from './path/to/named-func'

describe(MyFunc, () => {});
describe(NamedFunc, () => {});
describe(NamedFunc.banana, () => {});
`,
      },
    ],
    invalid: [
      {
        code: `
import MyFunc from './path/to/my-func'
import { NamedFunc } from './path/to/named-func'

describe("MyFunc", () => {});
describe(NamedFunc.name, () => {});
`,
        errors: [
          {
            message:
              "Prefer making the describe label the tested function, instead of the function's name",
            line: 5,
            column: 10,
            endLine: 5,
            endColumn: 18,
          },
          {
            message:
              "Prefer making the describe label the tested function, instead of the function's name property",
            line: 6,
            column: 10,
            endLine: 6,
            endColumn: 24,
          },
        ],
        output: `
import MyFunc from './path/to/my-func'
import { NamedFunc } from './path/to/named-func'

describe(MyFunc, () => {});
describe(NamedFunc, () => {});
`,
      },
    ],
  })
})

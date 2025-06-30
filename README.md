This package contains custom ESLint rules that we use here at [Relevance AI](https://relevanceai.com/). These rules aren't intended for public usage (some of them are quite specific and opinionated), so we don't recommend using them in your projects.

## Rule overviews

See the implementations for more specifics.

### no-vitest-and-expect-package

This rule errors when importing from both `expect` and `vitest` in the same file. When using vitest, you should use its version of `expect()`.

### prefer-function-as-describe-label

This rule errors when a string literal or `Function.name` is passed to Vitest's `describe` function. You should pass the function directly, so the describe block name stays in-sync with the function name.

Bad:

```js
function Foo() {}
describe('Foo', () => {})
```

```js
function Foo() {}
describe(Foo.name, () => {})
```

Good:

```js
function Foo() {}
describe(Foo, () => {})
```

### prefer-vi-mock-import-expression

This rule errors when passing a path to `vi.mock`. You should pass an import expression instead as this:

- makes `vi.mock` type-safe since we can't refer to modules that don't exist.
- allows TypeScript to infer the correct type for the mock factory (2nd arg to `vi.mock`).
- makes refactoring by moving files around easier since VSCode updates import expressions when you do.

Bad:

```js
vi.mock('~/dependencies', () => {})
```

Good:

```js
vi.mock(import('~/dependencies'), () => {})
```

### pascal-case

This rule errors when a variable, containing a function, doesn't have a PascalCase name.
The rule was written to replace @typescript-eslint/naming-convention for our needs, since it was taking up about 25 seconds, or about 40%, of the time taken to lint one of our repos.

Bad:

```js
const foo = () => {}
```

Good:

```js
const Foo = () => {}
```

We intentionally don't generate fixes for the naming violations, since that would require analysing which parts of a variable are words/acronyms.

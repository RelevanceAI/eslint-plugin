This package contains custom ESLint rules that we use here at [Relevance AI](https://relevanceai.com/). These rules aren't intended for public usage (some of them are quite specific and opinionated), so we don't recommend using them in your projects.

## Rule overviews

See the implementation for more specifics.

### no-vitest-and-expect-package

This rule errors when importing from both `expect` and `vitest` in the same file. When using vitest, you should use its version of `expect()`.

### prefer-function-as-describe-label

TODO?

### prefer-vi-mock-import-expression

TODO?

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

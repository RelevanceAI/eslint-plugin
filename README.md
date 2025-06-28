This package contains custom ESLint rules that we use here at [Relevance AI](https://relevanceai.com/). These rules aren't intended for public usage (some of them are quite specific and opinionated), so we don't recommend using them in your projects.

## Rule overviews
See the implementation for more specifics.

### no-vitest-and-expect-package
This rule errors when importing from both `expect` and `vitest` in the same file. When using vitest, you should use its version of `expect()`.
### prefer-function-as-describe-label
TODO?
### prefer-vi-mock-import-expression
TODO?
### pascal-case-functions-and-types
TODO?
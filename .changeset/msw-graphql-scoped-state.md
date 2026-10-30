---
'@nxgt/msw-graphql': minor
---

Per-scope mock state helpers. `scoped(make)` is a mutable object (a `Map`, a `Set`, an array, a record) with one instance per mock scope, used exactly as the object itself; `scopedValue(initial)` is a `{ get, set }` slot per scope; `scopedCounter()` is a `{ next, reset }` count per scope. All three key on `currentScope()` (the default scope is `""`), so an app that uses `createMockServerTest(…, { scope: true })` splits its mock data between parallel workers without writing the proxies itself. `clearScopedState(scope?)` drops one scope's state, or every scope's, for a control `reset` (an unscoped reset clears all) and frees the stores of scopes that are gone.

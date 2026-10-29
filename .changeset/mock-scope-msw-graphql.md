---
'@nxgt/msw-graphql': minor
---

Mock scopes. `control.scope(id)` returns `reset`, `fail`, `scenario`, `override` and `failing` acting on one scope: its own forced failure, overrides and event streams, so parallel workers stop resetting each other's mocks. `control.handle` reads the `x-mock-scope` header (an invalid one is a 400). The app's `reset` option and scenarios receive `{ scope }` as a last, optional argument on a scoped call. New helpers `scopeOf(request)`, `withScope(scope, fn)` (an `AsyncLocalStorage`, read by the executor and the override handlers), `currentScope()` and `SCOPE_HEADER`; `MockState` gains `scopes`, and `closeStreams(state, scope?)` ends one scope's streams. Without a scope, behaviour is unchanged.

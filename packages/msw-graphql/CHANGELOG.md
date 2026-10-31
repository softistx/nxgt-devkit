# @nxgt/msw-graphql

## 0.7.0

### Minor Changes

- [#121](https://github.com/softistx/nxgt-devkit/pull/121) [`5688566`](https://github.com/softistx/nxgt-devkit/commit/5688566afc28e1e73ebb775bd8a51529d290ec62) Thanks [@SteveGT96](https://github.com/SteveGT96)! - Widen the optional peers to the newest `@graphql-tools` majors: `@graphql-tools/mock` `^9.1.0 || ^10.0.0` and `@graphql-tools/schema` `^10.0.0 || ^11.0.0`. The `/schema` entry is tested against mock 10 and schema 11; the older majors stay accepted, as the API it uses did not change, but are not measured.

## 0.6.0

### Minor Changes

- [#106](https://github.com/softistx/nxgt-devkit/pull/106) [`923784b`](https://github.com/softistx/nxgt-devkit/commit/923784b424c874e581f615b5af38af6e9e15171b) Thanks [@SteveGT96](https://github.com/SteveGT96)! - Per-scope mock state helpers. `scoped(make)` is a mutable object (a `Map`, a `Set`, an array, a record) with one instance per mock scope, used exactly as the object itself; `scopedValue(initial)` is a `{ get, set }` slot per scope; `scopedCounter()` is a `{ next, reset }` count per scope. All three key on `currentScope()` (the default scope is `""`), so an app that uses `createMockServerTest(…, { scope: true })` splits its mock data between parallel workers without writing the proxies itself. `clearScopedState(scope?)` drops one scope's state, or every scope's, for a control `reset` (an unscoped reset clears all) and frees the stores of scopes that are gone.

## 0.5.0

### Minor Changes

- [#103](https://github.com/softistx/nxgt-devkit/pull/103) [`5b3fef1`](https://github.com/softistx/nxgt-devkit/commit/5b3fef1d1d0f9bf7502967247322470053bc5114) Thanks [@SteveGT96](https://github.com/SteveGT96)! - Mock scopes. `control.scope(id)` returns `reset`, `fail`, `scenario`, `override` and `failing` acting on one scope: its own forced failure, overrides and event streams, so parallel workers stop resetting each other's mocks. `control.handle` reads the `x-mock-scope` header (an invalid one is a 400). The app's `reset` option and scenarios receive `{ scope }` as a last, optional argument on a scoped call. New helpers `scopeOf(request)`, `withScope(scope, fn)` (an `AsyncLocalStorage`, read by the executor and the override handlers), `currentScope()` and `SCOPE_HEADER`; `MockState` gains `scopes`, and `closeStreams(state, scope?)` ends one scope's streams. Without a scope, behaviour is unchanged.

## 0.4.0

### Minor Changes

- [#97](https://github.com/softistx/nxgt-devkit/pull/97) [`6fad339`](https://github.com/softistx/nxgt-devkit/commit/6fad339438f3cdd8f4df09b32c0481b760f3921f) Thanks [@SteveGT96](https://github.com/SteveGT96)! - Serve GraphQL subscriptions over SSE: a subscription asked with `Accept: text/event-stream` runs with the schema's async-iterator resolvers and answers graphql-sse `next` / `complete` events, a refusal before the stream with a real HTTP status (and `extensions.http.headers`), and an error payload mid-stream. `control.reset()` ends live streams; `closeStreams(state)` does it alone. `MockState` gains `streams`.

## 0.3.0

### Minor Changes

- [#52](https://github.com/softistx/nxgt-devkit/pull/52) [`5d3caab`](https://github.com/softistx/nxgt-devkit/commit/5d3caab4ea40ef7f0ee2586e28be1a7115b2a749) Thanks [@SteveGT96](https://github.com/SteveGT96)! - `startMockServer` now intercepts `fetch` under Bun with msw 3. msw 3's `setupServer` patches `node:net`, which Bun's `fetch` never reaches (mswjs/msw#2811, closed as expected behaviour), so under Bun it built a server that mocked nothing. Under Bun with msw 3 the server now patches `globalThis.fetch` itself and resolves each request with msw's public `getResponse` (the function `createMockFetch` uses; they share their code), falling back to the original `fetch` when no handler answers. It is built on `getResponse`, not on `msw/experimental`, because an experimental msw API may change in a minor. Same `{ server, control }`, with `listen`, `close` (restores `fetch` when nothing wrapped it since; otherwise the closed patch forwards to the original), `use`, `resetHandlers`, `restoreHandlers`, `listHandlers` and the `bypass` / `warn` / `error` policies with msw's messages. The one difference from `setupServer` under Bun: `server.events` and `server.boundary()` throw an error saying why. It patches `globalThis.fetch` only, so a `node:http` client is not mocked there; `createMockFetch` still covers it. Node and msw 2 are unchanged. `bypass()` is supported: a resolver doing `fetch(bypass(request))` reaches the real server (msw marks it with `accept: msw/passthrough`; the marker is stripped), in `startMockServer` under Bun and in `createMockFetch`. Behaviour change in `createMockFetch`: a handler's `passthrough()` is now sent to `fallback` (or the real `fetch`), as msw does, instead of returning msw's 302 response to the caller; it is not an unhandled request, so `strict` does not throw for it.

## 0.2.1

### Patch Changes

- [#33](https://github.com/softistx/nxgt-devkit/pull/33) [`2747587`](https://github.com/softistx/nxgt-devkit/commit/27475877c3c9e3dd4308b9ce4d2dcfea9e8f760f) Thanks [@SteveGT96](https://github.com/SteveGT96)! - Docs: `@graphql-codegen/typescript-msw` 4.0.2 fixes the graphql 17 crash, so the temporary `bun patch` is gone from troubleshooting; on msw 3, generate handlers with `@nxgt/graphql-codegen-msw`.

## 0.2.0

### Minor Changes

- [#25](https://github.com/softistx/nxgt-devkit/pull/25) [`8aae7c1`](https://github.com/softistx/nxgt-devkit/commit/8aae7c1cfd6bef60e2bd25928e6cfcdd89b8e9b7) Thanks [@SteveGT96](https://github.com/SteveGT96)! - `startMockServer` is idempotent per process: a second call returns the first call's `{ server, control }` (kept on `globalThis` under `Symbol.for('@nxgt/msw-graphql/node')`), so an SSR entry module re-evaluated under HMR no longer stacks listeners. The second call's handlers and options are ignored; `server.close()` forgets the server so the next call starts a new one (so does `dispose()`, where msw has one).

## 0.1.1

### Patch Changes

- [#21](https://github.com/softistx/nxgt-devkit/pull/21) [`6c13c0c`](https://github.com/softistx/nxgt-devkit/commit/6c13c0cc978a34a987860f54e6aee4fc5cb6fd7d) Thanks [@SteveGT96](https://github.com/SteveGT96)! - The `typescript` peer accepts TypeScript 7 (`^6.0.3 || ^7.0.0`); the package builds and typechecks under 7.0.2. The control guide says that an app's own control routes become scenarios.

## 0.1.0

### Minor Changes

- [#10](https://github.com/softistx/nxgt-devkit/pull/10) [`d0803db`](https://github.com/softistx/nxgt-devkit/commit/d0803db4e67064bb1d9878773fa7f2817bba3e85) Thanks [@SteveGT96](https://github.com/SteveGT96)! - First release: mock a GraphQL API with msw by executing the real operations
  against a schema.
  
  - `.`: `createExecutor` (failing, guard, parse, validate, execute, HTTP status
    from `extensions.http.status`), `graphqlEndpoint`, `GraphQLHttpError`,
    `bearerToken`.
  - `/schema` (`buildMockSchema`) and `/sdl` (`loadSdl`: Vite `?raw` or a file read).
  - `/browser` (`enableMocking`), `/node` (`startMockServer`) and `/response`.
  - `/fetch` (`createMockFetch`): a `fetch` answered by the handlers, with no
    global patch, for an API client that takes a fetch. It works with msw 2 and
    3 under Node and Bun.
  - `/control` (`createMockControl`): reset, fail, scenarios with arguments and
    per-operation overrides, programmatically or over `POST /__mocks/*`, with a
    production guard.
  
  Peers: `msw ^2.12.10 || ^3.0.0` (msw 3's Node server does not intercept Bun's
  fetch, mswjs/msw#2811: under Bun, use `/fetch` or msw 2), `graphql ^16 || ^17`.

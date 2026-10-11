# @nxgt/msw-graphql

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

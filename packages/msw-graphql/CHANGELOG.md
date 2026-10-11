# @nxgt/msw-graphql

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

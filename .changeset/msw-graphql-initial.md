---
"@nxgt/msw-graphql": minor
---

First release: mock a GraphQL API with msw by executing the real operations
against a schema.

- `.`: `createExecutor` (failing, guard, parse, validate, execute, HTTP status
  from `extensions.http.status`), `graphqlEndpoint`, `GraphQLHttpError`,
  `bearerToken`.
- `/schema` (`buildMockSchema`) and `/sdl` (`loadSdl`: Vite `?raw` or a file read).
- `/browser` (`enableMocking`), `/node` (`startMockServer`) and `/response`.
- `/control` (`createMockControl`): reset, fail, scenarios with arguments and
  per-operation overrides, programmatically or over `POST /__mocks/*`, with a
  production guard.

Peers: `msw ^2.12.10 || ^3.0.0` (msw 3's Node server does not intercept Bun's
fetch, so an app whose server runs on Bun stays on msw 2), `graphql ^16 || ^17`.

# Roadmap

A direction, not a commitment. Nothing is published yet, so no version
appears on this page; `CHANGELOG.md` will hold the history once there is one.

## Now

- **First release** — publish the package with the surface listed under
  Shipped, tested on graphql 16 and 17 and on msw 2 and 3.

## Next

- **Generated handlers on msw 3** — `@graphql-codegen/typescript-msw` emits
  `graphql.query(...)` handlers that msw 3 removed. Until a generator targets
  `graphql.link(url).query(...)`, use `graphqlEndpoint` on msw 3. See
  [troubleshooting](./troubleshooting.md).
- **Drop the generator patch** — once
  [graphql-code-generator-community#1653](https://github.com/dotansimha/graphql-code-generator-community/pull/1653)
  is released and adopted, the `bun patch` in troubleshooting goes away.
- **`loadSdl` against a real Vite build** — the Vite branch is covered by
  unit tests only; a run under Vite is wanted.
- **`enableMocking` in a real browser** — only the disabled path and the
  handler-shape unwrapping are tested; a browser run is wanted.

## Later

- **msw 3 under Bun** — if msw's interceptors learn to patch Bun's native
  `fetch`, the msw 2 restriction for servers that run on Bun can be lifted.

## Not planned

- **JWT and OAuth helpers** — signing or reading a token needs each app's
  issuer, secret and audience, so a shared helper would fit no app. The
  package ships `bearerToken(request)`; the app builds its context from it.
- **Concrete schemas, handlers and mock data** — they are the app's.

## Shipped

First release contents (no version yet):

- **`createExecutor`** — runs real operations against a schema; failing
  state, guard, parse and validation errors, HTTP status from
  `extensions.http.status`.
- **`graphqlEndpoint`, `bearerToken`, `GraphQLHttpError`, `createMockState`.**
- **`/schema`** — `buildMockSchema`.
- **`/sdl`** — `loadSdl`, one loader for Vite and Node.
- **`/browser`** — `enableMocking`.
- **`/node`** — `startMockServer`.
- **`/control`** — `createMockControl`: reset, fail, scenario, override over
  HTTP or in code.
- **`/response`** — `ok`, `created`, `noContent`, `badRequest`,
  `unauthorized`, `forbidden`, `notFound`, `graphqlErrors`.
- **Peers** — `msw ^2.12.10 || ^3.0.0`, `graphql ^16 || ^17`.

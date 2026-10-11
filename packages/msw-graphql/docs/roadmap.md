# Roadmap

A direction, not a commitment. The version something shipped in is the only
number on this page; [`CHANGELOG.md`](../CHANGELOG.md) holds the full history.

## Now

Nothing is in progress.

## Next

- **Generated handlers on msw 3** — `@graphql-codegen/typescript-msw` emits
  `graphql.query(...)` handlers that msw 3 removed. Until a generator targets
  `graphql.link(url).query(...)`, use `graphqlEndpoint` on msw 3. See
  [troubleshooting](./troubleshooting.md).
- **Drop the generator patch** — once
  [graphql-code-generator-community#1653](https://github.com/dotansimha/graphql-code-generator-community/pull/1653)
  is released and adopted, the `bun patch` in troubleshooting goes away.

## Later

- **`startMockServer` on msw 3 under Bun** — once
  [mswjs/msw#2811](https://github.com/mswjs/msw/issues/2811) is fixed,
  `startMockServer` works under Bun with msw 3 too. Until then, use
  `createMockFetch`, or msw 2.

## Not planned

- **JWT and OAuth helpers** — signing or reading a token needs each app's
  issuer, secret and audience, so a shared helper would fit no app. The
  package ships `bearerToken(request)`; the app builds its context from it.
- **Concrete schemas, handlers and mock data** — they are the app's.

## Shipped

Tests only, no release:

- **`loadSdl` against a real Vite build** — a fixture built with `vite build`
  inlines the SDL and the built module resolves it.
- **`enableMocking` in a real browser** — Chromium, a test server serving
  msw's worker script, a handler answering a fetch.

Next minor, unreleased:

- **Idempotent `startMockServer`** — a second call in the same process returns
  the running server and control (its arguments are ignored), so an SSR entry
  re-evaluated under HMR does not stack listeners.

First release, 0.1.0, tested on graphql 16 and 17 and on msw 2 and 3:

- **`createExecutor`** — runs real operations against a schema; failing
  state, guard, parse and validation errors, HTTP status from
  `extensions.http.status`.
- **`graphqlEndpoint`, `bearerToken`, `GraphQLHttpError`, `createMockState`.**
- **`/schema`** — `buildMockSchema`.
- **`/sdl`** — `loadSdl`, one loader for Vite and Node.
- **`/browser`** — `enableMocking`.
- **`/node`** — `startMockServer`.
- **`/fetch`** — `createMockFetch`: a `fetch` answered by the handlers with
  no global patch, for an SSR/BFF client that takes a fetch; works on msw 2
  and 3, Node and Bun.
- **`/control`** — `createMockControl`: reset, fail, scenario, override over
  HTTP or in code.
- **`/response`** — `ok`, `created`, `noContent`, `badRequest`,
  `unauthorized`, `forbidden`, `notFound`, `graphqlErrors`.
- **Peers** — `msw ^2.12.10 || ^3.0.0`, `graphql ^16 || ^17`.

- **TypeScript 7 peer** — the `typescript` peer is `^6.0.3 || ^7.0.0`. 0.1.1.

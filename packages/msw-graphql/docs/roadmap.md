# Roadmap

A direction, not a commitment. The version something shipped in is the only
number on this page; [`CHANGELOG.md`](../CHANGELOG.md) holds the full history.

## Now

- **Mock scopes** — `control.scope(id)` keeps the forced failure, overrides and
  event streams per scope, `handle` reads `x-mock-scope`, and `scopeOf` /
  `withScope` carry the scope from an app's request to its API calls, so
  parallel Playwright workers stop resetting each other's mocks.

## Next

Nothing is planned yet.

## Later

Nothing is parked.

## Not planned

- **JWT and OAuth helpers** — signing or reading a token needs each app's
  issuer, secret and audience, so a shared helper would fit no app. The
  package ships `bearerToken(request)`; the app builds its context from it.
- **Concrete schemas, handlers and mock data** — they are the app's.

## Shipped

- **Subscriptions over SSE** — a subscription asked with `Accept: text/event-stream` runs
  with scripted async-iterator resolvers and answers `next` / `complete`
  events, a refusal before the stream with a real status, an error payload
  mid-stream; `control.reset()` and `closeStreams` end live streams.
- **`startMockServer` on msw 3 under Bun** (0.3.0) — it patches
  `globalThis.fetch` and answers with msw's public `getResponse` (shared with
  `createMockFetch`) where `setupServer` intercepts nothing, with the same
  `{ server, control }`. `fetch` only; `server.events` and `server.boundary()`
  throw there. Node and msw 2 are unchanged.
- **`bypass()` and `passthrough()`** (0.3.0) — `fetch(bypass(request))` in a
  resolver reaches the real server, under Bun and in `createMockFetch`; a
  handler's `passthrough()` in `createMockFetch` now goes to `fallback` (or the
  real `fetch`) instead of returning msw's 302.
- **Generated handlers on msw 3, without a patch** (docs, 0.2.1) —
  `@nxgt/graphql-codegen-msw` generates msw 3 handlers per operation, and
  `typescript-msw` 4.0.2 runs on graphql 17, so troubleshooting no longer
  carries a `bun patch`.
- **Idempotent `startMockServer`** (0.2.0) — a second call in the same
  process returns the running server and control (its arguments are
  ignored), so an SSR entry re-evaluated under HMR does not stack listeners.

Tests only, no release:

- **`loadSdl` against a real Vite build** — a fixture built with `vite build`
  inlines the SDL and the built module resolves it.
- **`enableMocking` in a real browser** — Chromium, a test server serving
  msw's worker script, a handler answering a fetch.

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

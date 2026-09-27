# Roadmap

A direction, not a commitment. The version something shipped in is the only
number on this page; [`CHANGELOG.md`](../CHANGELOG.md) holds the full history.

## Now

Nothing in progress.

## Next

- **msw response helpers** — `ok`, `created`, `badRequest` and the other
  common statuses, plus GraphQL `data` / `errors` bodies, so a handler is one
  line instead of a hand-built `HttpResponse`. Whether these belong here or in
  `@nxgt/openapi-msw` is decided before they are built.
- **GraphQL mock server** — a schema and resolvers in, an `executeGraphQL`
  out, so msw handlers answer GraphQL operations from resolvers rather than
  fixed payloads.
- **Dual SDL loader** — one way to load a `.graphql` schema that works both in
  the browser (Vite `?raw`) and in Node (`node:fs`).
- **Idempotent `setupServer` start** — start msw in an SSR app's server
  process once, however many times the entry module is evaluated, so its
  server-side requests are mocked too.

## Later

- **Live identity stack helpers** — for suites that run against a real
  identity stack: a `globalSetup` that fails fast with a hint when the stack
  is unreachable, a run id for unique test data, and a `fetch` executed inside
  a compose service.
- **Dark-mode previews** — capture each tagged story in the dark theme as well
  as the light one.
- **Preview check in CI** — fail the build when a story changed but its WebP
  preview did not.

## Not planned

- **Concrete page objects, test ids, credentials, handlers and mock data** —
  a sign-in or sign-up page, the ids it targets, the accounts it logs in with
  and the network it mocks are the application's, not the library's. The
  package ships the bases (`BasePage`, `FormPage`, `withLoginFixture`,
  `createMswTest`) they are built from.

## Shipped

- **Storybook stories as Vitest browser tests** — `storybookProject` renders
  every story in Chromium as a smoke test, and with `capture` writes WebP
  previews of the stories tagged `preview`. 0.1.0.
- **msw network fixtures** — `createMswTest` extends Playwright's `test` with
  msw handlers per test. 0.1.0.
- **Hydration-safe fills** — `fillSettled` and `fillUntilEnabled` keep typing
  from being lost to a page that is still hydrating. 0.1.0.
- **Login and storage-state fixtures** — `authSetup`, `authFile` and
  `withLoginFixture` sign in once and reuse the stored state. 0.1.0.
- **Page object bases** — `BasePage` and `FormPage`. 0.1.0.
- **Shared app config** — `defineAppConfig` for a Playwright config every app
  would otherwise repeat. 0.1.0.

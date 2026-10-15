# Roadmap

A direction, not a commitment. The version something shipped in is the only
number on this page; [`CHANGELOG.md`](../CHANGELOG.md) holds the full history.

## Now

Nothing is in progress.

## Next

Nothing is planned yet.

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
- **Off-canvas menu and date-picker helpers** — they depend on a component
  library's labels and markup; a page object in the app wraps them in two
  lines, and a package-wide version would fit no library.

## Shipped

- **Responsive checks** — `expectNoTextOverflow` fails on a label clipped
  without its full text or spilling out of its box, `expectTapTargets` on a
  control under 44x44px on a phone (24px stays axe's `target-size`), and
  `checkScreen` runs either with `textOverflow` / `tapTargets`, off by default.
  0.8.0.
- **Stories in Firefox and WebKit** — `storybookProject({ browsers })` runs
  the stories in each browser listed, Chromium by default. 0.8.0.
- **Playwright 1.61 floor** — the `@playwright/test` peer is `^1.61.0`: from
  that version `goOffline` also takes a service worker's own fetches offline.
  0.7.0.
- **Application checks in one call** — `/csp` fails a test on a
  Content-Security-Policy refusal and checks the nonce on every script, the
  2.4.11 focus check keeps a focused field out from under a sticky bar, and
  `checkScreen` waits for fonts and motion, saves the screen, then scans it and
  checks that nothing scrolls sideways. 0.7.0.
- **Sticky bars in accessibility scans** — `expectAccessible` puts sticky form
  actions back in the flow while axe runs, so `target-size` no longer flags a
  control half under the bar; `unstick` adds an app's own bars
  (`DEFAULT_UNSTICK`). 0.6.0.
- **A CI leg for `/msw`'s lower peers** — the `/msw` specs run on msw 2.12.10
  with `@msw/playwright` 0.6.7, the bottom of the supported range, in every
  CI run (`scripts/test-lower-peers.ts`). CI only, no release.
- **TypeScript 7 peer** — the `typescript` peer is `^6.0.3 || ^7.0.0`. 0.5.1.
- **Wider `/msw` peers** — `msw` `^2.12.10 || ^3` and `@msw/playwright`
  below 0.8. 0.5.0.
- **Server-side mock control** — `createMockServerTest` and `./mock-server`:
  a `mockServer` fixture (`reset`, `fail`, `scenario`, `use`) and the
  `serverMocks` option drive the mocks of an SSR app's server over HTTP. 0.5.0.
- **PWA end-to-end helpers** — `/pwa`: `pwaProject` and `isPwaRun` for a run
  against a production build on a port of its own, `goOffline` / `goOnline`
  once the worker controls the page, `nextWorkerVersion` for an update
  prompt's specs, `cachedUrls` and `expectNotCached`, and `fillCaches` /
  `expectOnlyCaches` for what a sign-out or a new worker leaves of the
  caches. 0.4.0.
- **Hydration-aware navigation** — `withHydration` makes every `goto` resolve
  once the page is interactive, `hydrated` waits on demand, and
  `hydrationWarnings` reports mismatches; `/react-router` adds a marker that
  needs nothing from the app and `elementHydrated` for late elements. 0.3.0.
- **Settled-page waits and toasts** — `nextFrames`, `settled` (finite
  animations and transitions ended), `toastsGone` and `isMobileProject`. 0.3.0.
- **Inner-scroller check** — `expectNoHorizontalScroll` takes a `scroller`, so
  an app shell whose `main` scrolls sideways is caught. 0.3.0.
- **Full-page screens** — `saveScreen` captures an inner-scrolling app shell
  whole, per project, and `defineAppConfig({ screens })` empties the folder on
  a `SCREENS=1` run. 0.3.0.
- **`--project` in workers** — `selectedProjects` gives a config the same
  answer in the runner and in its workers. 0.3.0.
- **PWA cache checks** — `serviceWorkerControlled`, `cachedUrls` and
  `expectNotCached`. 0.3.0.

Older entries are in [`CHANGELOG.md`](../CHANGELOG.md).

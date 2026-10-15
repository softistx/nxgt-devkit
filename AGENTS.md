# AGENTS.md

Instructions for any coding agent working in `nxgt-devkit`.

## What this repository is

The `@nxgt/*` packages for **testing and CI** — the boilerplate every
application repository used to copy by hand, written once and published to
the public npm registry.

| package | what it is |
| --- | --- |
| `@nxgt/playwright` | Playwright and Vitest browser-mode tooling: `defineAppConfig` (the `playwright.config.ts` every app spelled out), `BasePage` / `FormPage`, `authSetup` / `authFile` / `withLoginFixture` for storage states, `fillSettled` / `fillUntilEnabled` for inputs a hydration resets, `withHydration` / `hydrated` (a `goto` that waits for a hydration marker; the React Router marker in the `./react-router` adapter), `settled` / `nextFrames` / `toastsGone`, `expectAccessible` (axe), `expectFocusAboveActions` / `expectFieldsAboveActions` (WCAG 2.4.11, `/a11y`), `/csp` (`cspTest`, `expectNoncedPage`: no CSP refusal, nonces on every script), `checkScreen` (a screen's a11y and overflow checks, plus opt-in `textOverflow` / `tapTargets`), `expectNoHorizontalScroll` (with an inner `scroller`), `expectNoTextOverflow` and `expectTapTargets` (44px on a phone), phone projects through `defineAppConfig`'s `mobile`, `saveScreen` and `defineAppConfig`'s `screens` (full-page screens, a folder emptied by a packaged global setup), `selectedProjects` (`--project` seen by the workers), `/pwa`'s production-build project (`pwaProject`, `isPwaRun`), offline (`goOffline` / `goOnline`), a new worker version (`nextWorkerVersion`) and cache checks (`cachedUrls`, `expectNotCached`, `fillCaches`, `expectOnlyCaches`), `createMswTest` for msw through `@msw/playwright`, `createMockServerTest` (`/mock-server`: a `mockServer` fixture that resets, fails, runs scenarios and overrides operations of an app server's mocks over HTTP, for `@nxgt/msw-graphql`'s control), and `storybookProject` — Storybook stories as Vitest browser tests (Chromium, Firefox, WebKit through `browsers`), with WebP preview capture for component-library docs |
| `@nxgt/msw-graphql` | Mock a GraphQL API with msw by executing the real operations against a schema: `createExecutor` (parse, validate, execute, status from `extensions.http.status`), `graphqlEndpoint`, `GraphQLHttpError`, `bearerToken`; `/schema` (`buildMockSchema`), `/sdl` (`loadSdl`, Vite `?raw` or a file read), `/browser` (`enableMocking`), `/node` (`startMockServer`), `/fetch` (`createMockFetch`, a fetch answered by the handlers, with no global patch), `/control` (`createMockControl`), `/response` |

`ROADMAP.md` lists what is planned next — `@nxgt/jenkins` among it. Nothing
there is started until it has an entry in the work queue.

It was started on 2026-09-27 on the skeleton of `softistx/nxgt-data`
(`lay-out-a-library-monorepo` in the `nxgt-monorepo` plugin): the same build,
artifact check, publish script, release workflow and conventions. When one of
them changes there for a reason that applies here, change it here too.

## Where the code came from

`@nxgt/playwright` was extracted from what the application repositories had in
`playwright/`. At extraction, sixteen repositories carried a byte-identical
`pages/base.page.ts`, fourteen an identical `form.page.ts`, ten an identical
msw fixture in `config/playwright.setup.ts`, and a dozen the same
`playwright.config.ts` with a different port. Each export replaces one of
those files; the migration table is in
`packages/playwright/docs/guide/`.

**What was not extracted, on purpose**: concrete page objects (`SignInPage`,
…), test ids, credentials, msw handlers and mock data. They are the
application's. A helper that needs one of them takes it as an argument
(`authSetup`'s `signIn`, `createMswTest`'s `handlers`).

The 0.3.0 helpers came from one application's `playwright/support/` the same
way; left there on purpose: an off-canvas menu's `openMenu` / `followMenu`
and a date picker's `pickDay` (a component library's labels and markup), the
axe exclusions of a component library's known faults, and the app's own rules a screen's checks name (its axe wrapper, its scroller),
which `checkScreen` takes as options (`a11y`, `scroller`).
Framework specifics sit behind an adapter subpath (`./react-router`); the
generic contract is a marker (`html[data-hydrated]`).

The 0.4.0 `/pwa` helpers came from the same application's PWA specs; left
there: its cache names (`fillCaches` and `expectOnlyCaches` take them as
arguments), its caching rules (which paths are static, that React Router's
`.data` requests are never stored, the precache against the router's
manifest), its offline page's words and its manifest's fields.

Two things changed on the way in, and both are fixes, not style:

- `PATHS.screenhot` (sic, in every copy) became `BasePage`'s `screenshotDir`
  option; the file name logic is `screenshotName`, tested.
- `fillUntilEnabled` waits for the button to stay enabled `settle` ms after
  the fill. The hand-written version returned as soon as it was enabled — which
  it is *before* hydration resets the form — and `test/e2e/helpers.pw.ts`
  fails on that version.

## Layering and peers

Every peer is **optional** and each subpath needs only its own:

| subpath | needs |
| --- | --- |
| `.`, `./config`, `./pages`, `./auth`, `./helpers`, `./pwa`, `./csp`, `./react-router` | `@playwright/test` |
| `./a11y` | + `@axe-core/playwright`, loaded on the first scan so a missing peer is named |
| `./screens` | `@playwright/test`; `checkScreen` needs `@axe-core/playwright` when the scan runs (the default, or an options object), reached through `a11y/scan`'s lazy `loadAxe` (never imported statically, never loaded with `a11y: false` or a function); the root re-exports it, so the same holds from `.` |
| `./msw` | + `msw` (2.12.10+ or 3), `@msw/playwright` (0.6.7 to 0.7; 0.7 needs msw 3) |
| `./mock-server` | `@playwright/test`; no msw import, it talks HTTP |
| `./storybook` | `vitest`, `@vitest/browser-playwright`, `@storybook/addon-vitest` |
| `./storybook/capture`, `./storybook/setup` | the same, **in the browser** |

`./mock-server` copies the wire types of `@nxgt/msw-graphql/control` (`ServerOverride`) on purpose, so it imports neither msw nor that package; `test/e2e/mock-server.pw.ts` imports both (`@nxgt/msw-graphql` is a devDependency) and fails to typecheck if the two types drift, and `test/server.ts` mounts the real control it drives. That spec runs in its own config (`test/playwright.mock-server.config.ts`, one worker): server mocks are process-global.

The in-page `measure` functions (`src/helpers/text-overflow/measure.ts`, `src/helpers/tap-targets/measure.ts`, and `measure` in `src/helpers/no-horizontal-scroll.ts`) each carry their own `collapse` / `brief` / `describe` because Playwright serialises them; a change to one is made in all three.
`src/helpers/tap-targets/hit-area.ts` (`probeHitAreas`, a second `page.evaluate`
that scrolls, where `measure` only reads) deliberately copies `tap-targets/measure.ts`'s
`collapse`, skip predicates (`is`), target selection loop and checkbox/radio union box,
because the indices `measure` returns are positions in that selection: change them in both.

The root barrel (`packages/playwright/src/index.ts`) re-exports `./auth`,
`./config`, `./helpers`, `./pages`, `./pwa` and `./screens`; `./csp` and
`./react-router` are not re-exported, nor are the rows with other peers. Adding an export that reaches
msw or Vitest to it would make every consumer install them.

`@nxgt/msw-graphql` has the same shape for its own peers: `.` needs `msw` and
`graphql`, `./schema` also the two optional `@graphql-tools/*` peers, `./sdl`
nothing.

**msw 3 and Bun.** msw 3's Node interceptors patch `node:net`, which Bun's
native `fetch` does not go through, so under Bun a plain `setupServer` intercepts
nothing (msw 2.15 does; mswjs/msw#2811, closed as expected). `startMockServer`
therefore patches `globalThis.fetch` itself under Bun with msw 3
(`src/node/bun-server.ts`), resolving each request with msw's public
`getResponse` through `src/handlers.ts`, the code `createMockFetch` shares, and
falling back to the original fetch. That is deliberate (owner, 2026-10-15): an
experimental msw API (`msw/experimental`'s `defineNetwork`, msw's interceptors)
may change in a minor, `getResponse` is public. Never reach for those, nor for
`createRequire`, to make this path richer. The cost is documented: `events` and
`boundary()` throw there, and `node:http` is not mocked. Its spec runs under
`bun test`; the weekly newest-peers run catches a minor that changes
`getResponse`. `scripts/node-smoke.mjs` runs a real msw server under Node against
the built `dist/`. `scripts/test-matrix.ts
<graphql> <msw>` runs the whole bar against other majors in a scratch copy;
CI runs it for graphql 16 and for msw 2, with full versions (`16 3.0.3`,
`17 2.15.0`); on msw 2 it also runs `scripts/bun-fetch-probe.ts --expect
intercepted`, which prints whether the installed msw sees Bun's fetch.

`@nxgt/playwright/msw`'s lower peer range (msw 2.12.10 with `@msw/playwright`
0.6.7) is measured by `packages/playwright/scripts/test-lower-peers.ts` (`bun
run test:lower-peers` there; CI runs it): in a scratch copy of the workspace it
installs those two, builds, typechecks the package and runs `test/e2e/msw.pw.ts`.
It keeps `bun.lock`, so the Chromium the lockfile's Playwright installed is
the one it uses.

The `@playwright/test` floor (`^1.61.0`) is measured by the same script with
`--playwright 1.61.1` (`bun run test:lower-peers --playwright 1.61.1`; a second
CI step): only `@playwright/test` moves, (and `@nxgt/msw-graphql`'s copy of it), with a root `overrides` entry for
`playwright-core` (`@axe-core/playwright` takes it as a peer, and the lockfile's
copy would be a second `Page` type). This leg downloads its own browser into the
shared cache (the workspace's is not that version's): it runs
`playwright install chromium-headless-shell`, as ci.yml's main step does, after
the install, then builds, typechecks
and runs the unit specs and both Playwright configs. Bump the version it is
given only to the newest patch of the floor's minor. The floor is 1.61 because
`goOffline` needs `context.setOffline` to reach the service worker's fetches:
`pwa.pw.ts` "offline, the worker answers from its cache" fails on 1.55.1, 1.56.1,
1.57.0, 1.58.2, 1.59.1 and 1.60.0, and passes on 1.61.0 and every later minor
tried. `--grep <title>` bisects a failing spec across versions.

The `@nxgt/playwright/storybook` floors (`vitest` and `@vitest/browser-playwright`
`^4.0.0`, `@storybook/addon-vitest` `>=10.3.0 <11`) are measured by the same
script with `--vitest 4.0.18 --storybook 10.3.6` (a third CI step; `--vite`
defaults to 7.3.7, as vitest 4.0 accepts vite 6 or 7 only). In the scratch copy
`vitest` and `@vitest/browser-playwright` move to the first, `@storybook/addon-vitest`,
`storybook` and `@storybook/html-vite` to the second; Playwright stays at the
lockfile's, so the cached Chromium is used. It builds, typechecks, runs `bun test
src/storybook` and the `test/storybook/` fixture. Measured on 2026-10-15: all
green on vitest 4.0.18 with addon-vitest 10.3.6, so both floors hold as declared.
Give it the newest patch of each floor's minor.

`packages/msw-graphql/scripts/test-matrix.ts` and
`packages/playwright/scripts/lower-peers/index.ts` (behind the
`test-lower-peers.ts` entry) carry the same SIGINT/SIGTERM handler (a signal skips their `finally`): it removes the scratch folder and
re-raises the signal. Change both; a shared helper would cross the package
boundary.

**Newest peers.** `.github/workflows/newest-peers.yml` (weekly, and on demand)
and ci.yml's `newest-peers` job (pull requests only; not a required check) run
`scripts/newest-peers.ts`. That script and its spec come from the graphql repository's
`scripts/newest-peers.ts` (itself nxgt-data's) and are kept in step with it, but for
one comment: theirs says the lockfile pins "the oldest end of each peer range",
which is true there; here the lockfile pins the newest end of `graphql` and `msw`
(the oldest `msw` is `packages/playwright/scripts/test-lower-peers.ts`'s job), so
the comment names which end each peer is pinned at. It rewrites every peer to the newest end of its
range (TypeScript 7, graphql 17, msw 3, the latest `@playwright/test`,
`@msw/playwright`, `vitest`…), deletes `bun.lock`, installs, then builds,
typechecks, tests and verifies the artifacts. A red run is an upstream release
the range does not hold: fix the code or the range in a pull request, never
the workflow. Run it only in a scratch copy, never in a checkout you keep: it
edits the manifests, and a newer `playwright` replaces the Chromium build the
shared `~/.cache/ms-playwright` holds for the lockfile's version (run
`bunx playwright install chromium-headless-shell` in `packages/playwright`
again afterwards).

## Browser-only subpaths

`./storybook/capture` and `./storybook/setup` import `vitest/browser`, which
throws outside a Vitest browser run. They are declared under
`nxgt.browserOnly` in the package's `package.json`, and
`scripts/verify-artifacts.ts` packs and checks them but does not import them —
it prints a `skip … browser only` line for each rather than passing silently.
**This is the one divergence of `verify-artifacts.ts` from nxgt-data's copy.**
A subpath added there must be one whose own specs load it in a browser.

`storybookProject` points Vitest at `dist/storybook/setup.js` through
`new URL('./setup.js', import.meta.url)`, which is why `setup` is an entry
point and an export rather than an internal module: the file must exist beside
the built `index.js`.

The same holds for `screens/clear`: `defineAppConfig({ screens })` registers
it as Playwright's `globalSetup` by path, `new URL('../screens/clear.js',
import.meta.url)`. It is an entry point (under `nxgt.entrypoints`, not in
`exports`: nothing imports it) so the file exists; the relative URL holds from
`dist/config/` and from `dist/chunks/`, the two places the bundler may put
`clearScreensSetup` (`src/config/screens.ts`), both one folder below `dist/`. From the sources (the
specs) it resolves to `src/screens/clear.ts`. A spec asserts the file exists.

## Tests

**Build before typecheck.** In a fresh checkout or worktree, run `bun run build`
before `bun run typecheck` or `bun run test`. `@nxgt/playwright`'s specs import
`@nxgt/msw-graphql` through its `dist/` types, which only the build writes.

**Typecheck stays `tsc`, not `bun check`.** Bun 1.4.3's built-in checker
(there is no `bun tsc`: that runs `node_modules/.bin/tsc`) was measured here:
the same errors as tsc 6.0.3, word for word (a clean tree, a tree without
`dist/`, seeded errors), about ten times faster. It is not used, for three
reasons: it checks with Bun's own bundled TypeScript 6.0.3 and ignores
`node_modules/typescript` (shown in nxgt-graphql with a broken fake
`typescript` package; not re-measured here), so the newest-peers leg, which installs
TypeScript 7 (the peer is `^6.0.3 || ^7.0.0`), would silently check against
6; at the root, `bun check` runs this repository's `check` script (Biome)
instead of the built-in; and it emits nothing, so `build.ts` needs tsc for
the declarations anyway.

- `bun test src ./scripts/` — the pure logic: names, config, the Storybook
  project shape, and the lower-peers script's option parsing
  (`scripts/lower-peers/options.spec.ts`).
- `bun test ./test/storybook/` — a real-browser Storybook fixture (stories, a
  `.storybook`, a Vitest browser project made by `storybookProject`). Part of
  the package's `test` script. It imports the built `@nxgt/playwright/storybook`,
  so `bun run build` comes first. `STORYBOOK_BROWSERS=chromium,firefox,webkit`
  picks the browsers (chromium by default); ci.yml's non-required
  `storybook-browsers` job runs Firefox and WebKit. The lower-peers leg below
  runs it too.
- `playwright test -c test/playwright.config.ts` — the pages, fixtures, fills
  and msw against `test/server.ts`, a Bun server whose form resets its input
  once 250 ms after load, the way hydration does. The config is written with
  `defineAppConfig` itself. Specs are `*.pw.ts` so `bun test` never picks
  them up. `PW_PORT` moves the server and its URL in both test configs
  (default 4599, read there and in `test/server.ts`): run two worktrees at
  once with `PW_PORT=4600`, or `reuseExistingServer` makes them share one
  server.

`@nxgt/msw-graphql`'s `bun run test` also runs `test/vite` (`bun test`: a
fixture built with `vite build`, whose output must hold the inlined SDL) and
`test/browser` (Playwright, a plain config because this package cannot depend
on `@nxgt/playwright`, which depends on it: a `Bun.serve` test server on port
4598 serves a page, its `Bun.build` bundle and msw's `mockServiceWorker.js`,
and `enableMocking({ enabled: true })` runs in Chromium). Neither is part of
`scripts/test-matrix.ts`: they run on the workspace's graphql 17 and msw 3.

The browser: `bunx playwright install chromium-headless-shell`, matching the
installed `playwright`. On Arch or Manjaro (the `playwright` AUR package reads
`~/.cache/ms-playwright` too) Playwright downloads an Ubuntu fallback, which
works; **do not install Ubuntu system packages there** — set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` if the fallback fails.
CI runs on Ubuntu and uses `--with-deps`.

## Releasing

As in nxgt-data: `bun changeset`, merge to `develop`, merge the "Version
packages" pull request. `scripts/publish.ts` publishes with `bun publish` and
re-reads the registry before tagging. The token is `NPM_TOKEN`, read by
`bunfig.toml`. It lives in the GitHub environment `npm` (deployment branches:
`develop` only), never as a repository or organization secret, and the release
job declares `environment: npm`. Until the owner sets it there and removes
the organization secret (visible to every repository), the job still reads
the organization one.

A new package starts `"private": true`; removing it is a commit of its own.

After a publish, the `close-issues` job of `release.yml` runs
`scripts/close-released-issues.ts`, which comments on, labels `released` and
closes the issues the published versions fix. **`scripts/close-released-issues*.ts`
are byte-for-byte copies of nxgt-core's** (`scripts/` there, canonical in
`plugins/nxgt-issues/scripts/release/`): never edit them here, change them in
nxgt-core and copy again. `biome.json` has an override that turns the linter off for them, so
their lint infos stay out of `bun run check`; keep it when copying again. Its input is the `git-tag` NDJSON events
`scripts/publish.ts` writes to `$CHANGESETS_OUTPUT`, which `changesets/action@v2`
turns into the `published-packages` output. `scripts/tsconfig.json` turns on
`noImplicitAny` (the base config leaves it off) because the copied files rely
on it.

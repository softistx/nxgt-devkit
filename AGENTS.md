# AGENTS.md

Instructions for any coding agent working in `nxgt-devkit`.

## What this repository is

The `@nxgt/*` packages for **testing and CI** — the boilerplate every
application repository used to copy by hand, written once and published to
the public npm registry.

| package | what it is |
| --- | --- |
| `@nxgt/playwright` | Playwright and Vitest browser-mode tooling: `defineAppConfig` (the `playwright.config.ts` every app spelled out), `BasePage` / `FormPage`, `authSetup` / `authFile` / `withLoginFixture` for storage states, `fillSettled` / `fillUntilEnabled` for inputs a hydration resets, `withHydration` / `hydrated` (a `goto` that waits for a hydration marker; the React Router marker in the `./react-router` adapter), `settled` / `nextFrames` / `toastsGone`, `expectAccessible` (axe) and `expectNoHorizontalScroll` (with an inner `scroller`), phone projects through `defineAppConfig`'s `mobile`, `saveScreen` and `defineAppConfig`'s `screens` (full-page screens, a folder emptied by a packaged global setup), `selectedProjects` (`--project` seen by the workers), `/pwa`'s production-build project (`pwaProject`, `isPwaRun`), offline (`goOffline` / `goOnline`), a new worker version (`nextWorkerVersion`) and cache checks (`cachedUrls`, `expectNotCached`, `fillCaches`, `expectOnlyCaches`), `createMswTest` for msw through `@msw/playwright`, `createMockServerTest` (`/mock-server`: a `mockServer` fixture that resets, fails, runs scenarios and overrides operations of an app server's mocks over HTTP, for `@nxgt/msw-graphql`'s control), and `storybookProject` — Storybook stories as Vitest browser tests, with WebP preview capture for component-library docs |
| `@nxgt/msw-graphql` | Mock a GraphQL API with msw by executing the real operations against a schema: `createExecutor` (parse, validate, execute, status from `extensions.http.status`), `graphqlEndpoint`, `GraphQLHttpError`, `bearerToken`; `/schema` (`buildMockSchema`), `/sdl` (`loadSdl`, Vite `?raw` or a file read), `/browser` (`enableMocking`), `/node` (`startMockServer`), `/control` (`createMockControl`), `/response`. **Private until the owner's go** |

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
axe exclusions of a component library's known faults, and the composition of
checks a screen goes through (`checkScreen`), which names the app's own rules.
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
| `.`, `./config`, `./pages`, `./auth`, `./helpers`, `./screens`, `./pwa`, `./react-router` | `@playwright/test` |
| `./a11y` | + `@axe-core/playwright`, loaded on the first scan so a missing peer is named |
| `./msw` | + `msw` (2.12.10+ or 3), `@msw/playwright` (0.6.7 to 0.7; 0.7 needs msw 3) |
| `./mock-server` | `@playwright/test`; no msw import, it talks HTTP |
| `./storybook` | `vitest`, `@vitest/browser-playwright`, `@storybook/addon-vitest` |
| `./storybook/capture`, `./storybook/setup` | the same, **in the browser** |

`./mock-server` copies the wire types of `@nxgt/msw-graphql/control` (`ServerOverride`) on purpose, so it imports neither msw nor that package; `test/e2e/mock-server.pw.ts` imports both (`@nxgt/msw-graphql` is a devDependency) and fails to typecheck if the two types drift, and `test/server.ts` mounts the real control it drives. That spec runs in its own config (`test/playwright.mock-server.config.ts`, one worker): server mocks are process-global.

The root barrel re-exports only the first row, but for `./react-router`, an
adapter an app of another framework never needs. Adding an export that reaches
msw or Vitest to it would make every consumer install them.

`@nxgt/msw-graphql` has the same shape for its own peers: `.` needs `msw` and
`graphql`, `./schema` also the two optional `@graphql-tools/*` peers, `./sdl`
nothing.

**msw 3 and Bun.** msw 3's Node interceptors patch `node:net`, which Bun's
native `fetch` does not go through, so under Bun a `setupServer` intercepts
nothing (msw 2.15 does). `@nxgt/msw-graphql`'s specs therefore call handlers
with `getResponse` under `bun test`, and `scripts/node-smoke.mjs` runs a real
msw server under Node against the built `dist/`. `scripts/test-matrix.ts
<graphql> <msw>` runs the whole bar against other majors in a scratch copy;
CI runs it for graphql 16 and for msw 2, with full versions (`16 3.0.3`,
`17 2.15.0`); on msw 2 it also runs `scripts/bun-fetch-probe.ts --expect
intercepted`, which prints whether the installed msw sees Bun's fetch.

`@nxgt/playwright/msw`'s lower peer range (msw 2.12+ with `@msw/playwright`
0.6.7) is not exercised in CI; check it by hand before a release: in a scratch
copy, `bun add -d msw@2.12.10 @msw/playwright@0.6.7` in `packages/playwright`,
then `bun run test`.

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

- `bun test src` — the pure logic: names, config, the Storybook project shape.
- `playwright test -c test/playwright.config.ts` — the pages, fixtures, fills
  and msw against `test/server.ts`, a Bun server whose form resets its input
  once 250 ms after load, the way hydration does. The config is written with
  `defineAppConfig` itself. Specs are `*.pw.ts` so `bun test` never picks
  them up.

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
`bunfig.toml`, and must be set as a repository secret.

A new package starts `"private": true`; removing it is a commit of its own.

After a publish, the `close-issues` job of `release.yml` runs
`scripts/close-released-issues.ts`, which comments on, labels `released` and
closes the issues the published versions fix. **`scripts/close-released-issues*.ts`
are byte-for-byte copies of nxgt-core's** (`scripts/` there, canonical in
`plugins/nxgt-issues/scripts/release/`): never edit them here, change them in
nxgt-core and copy again. Its input is the `git-tag` NDJSON events
`scripts/publish.ts` writes to `$CHANGESETS_OUTPUT`, which `changesets/action@v2`
turns into the `published-packages` output. `scripts/tsconfig.json` turns on
`noImplicitAny` (the base config leaves it off) because the copied files rely
on it.

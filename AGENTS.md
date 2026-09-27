# AGENTS.md

Instructions for any coding agent working in `nxgt-devkit`.

## What this repository is

The `@nxgt/*` packages for **testing and CI** — the boilerplate every
application repository used to copy by hand, written once and published to
the public npm registry.

| package | what it is |
| --- | --- |
| `@nxgt/playwright` | Playwright and Vitest browser-mode tooling: `defineAppConfig` (the `playwright.config.ts` every app spelled out), `BasePage` / `FormPage`, `authSetup` / `authFile` / `withLoginFixture` for storage states, `fillSettled` / `fillUntilEnabled` for inputs a hydration resets, `createMswTest` for msw through `@msw/playwright`, and `storybookProject` — Storybook stories as Vitest browser tests, with WebP preview capture for component-library docs |

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
| `.`, `./config`, `./pages`, `./auth`, `./helpers` | `@playwright/test` |
| `./msw` | + `msw`, `@msw/playwright` |
| `./storybook` | `vitest`, `@vitest/browser-playwright`, `@storybook/addon-vitest` |
| `./storybook/capture`, `./storybook/setup` | the same, **in the browser** |

The root barrel re-exports only the first row. Adding an export that reaches
msw or Vitest to it would make every consumer install them.

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

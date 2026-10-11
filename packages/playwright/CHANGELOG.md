# @nxgt/playwright

## 0.3.0

### Minor Changes

- [#6](https://github.com/softistx/nxgt-devkit/pull/6) [`ebe44f2`](https://github.com/softistx/nxgt-devkit/commit/ebe44f2ddb7e0eb52281daf1bcf49beeaaaffdd8) Thanks [@SteveGT96](https://github.com/SteveGT96)! - Helpers for app suites that check every screen: hydration-aware navigation, a page at rest, full-page screens and PWA caches.
  
  - **`withHydration(test, options?)`** (`/helpers`): `page.goto` on every page of the context resolves once the page is hydrated — its marker holds, `<html data-hydrated>` by default, or any selector or in-page function — and two frames later. A response that is not a document is returned at once; `test.use({ hydration: false })` turns it off for a block. `hydrated(page, options?)` waits on a page already open; `hydrationWarnings(page)` collects the console's hydration-mismatch warnings.
  - **`@nxgt/playwright/react-router`** (new subpath, no new peer): `reactRouterHydrated`, a marker that needs nothing from a React Router app, and `elementHydrated(locator)` for an element React hydrates later.
  - **`settled(page)`** and **`nextFrames(page, count?)`**: wait for every finite animation and transition to end, and for a render's effects to run. **`toastsGone(page, text, { selector? })`**: the toast shows, the pointer moves off it, then no toast is left (sonner's by default). **`isMobileProject(testInfo)`**.
  - **`expectNoHorizontalScroll(page, { scroller })`**: also checks an inner scroll container — an app shell whose `main` scrolls — naming it and its widest elements.
  - **`@nxgt/playwright/screens`** (new subpath): `saveScreen(page, testInfo, name, options?)` saves `<dir>/<project>/<name>.png` full page, stretching the viewport so an inner-scrolling shell is captured whole; `savingScreens(testInfo)`. **`defineAppConfig({ screens })`** turns saving on when `SCREENS=1` and empties the folder first through a packaged global setup.
  - **`selectedProjects()`** (`/config`): the `--project` names of the command line, the same in the runner and in its workers, which load the config without it (`PW_PROJECTS`).
  - **`@nxgt/playwright/pwa`** (new subpath): `serviceWorkerControlled(page)`, `cachedUrls(page)` and `expectNotCached(page, url)`.
  
  Nothing changes for an existing suite: every addition is opt-in, and `expectNoHorizontalScroll` without `scroller` checks what it did.

## 0.2.0

### Minor Changes

- [#4](https://github.com/softistx/nxgt-devkit/pull/4) [`faee0ee`](https://github.com/softistx/nxgt-devkit/commit/faee0ee8ad0f27fa7d188fc414b3c2259976305e) Thanks [@SteveGT96](https://github.com/SteveGT96)! - Accessibility checks and phone projects.
  
  - **`@nxgt/playwright/a11y`** (new subpath; install the new optional peer
    `@axe-core/playwright`): `expectAccessible(page, options?)` runs axe with the
    WCAG 2.2 A/AA tags and fails with each violated rule, its impact, help link
    and first nodes, attaching the full report to the test as
    `accessibility-scan.json`. Options: `include`, `exclude`, `tags`, and
    `disableRules`, where each rule is given with a reason
    (`{ rule: 'color-contrast', reason: '…' }`, enforced by the types).
    `accessibilityScan` returns the results without asserting, `withA11y(test)`
    adds an `a11y` fixture, and `formatViolations` builds the message.
  - **`defineAppConfig({ mobile })`**: `true` adds a Pixel 7 project on Chromium
    named `mobile-chromium`; an array takes any of Playwright's devices
    (`['Pixel 7', 'iPhone 14']` → `mobile-chromium`, `mobile-webkit`). Mobile
    projects come after the desktop `browsers` and depend on the `setup` project
    like them.
  - **`expectNoHorizontalScroll(page)`** in `/helpers`: fails when the page
    scrolls sideways, naming the widest elements past the right edge.
  
  Nothing changes for an existing config: `mobile` is off by default, and the
  root `@nxgt/playwright` does not re-export `/a11y`.

### Patch Changes

- [#4](https://github.com/softistx/nxgt-devkit/pull/4) [`ae59177`](https://github.com/softistx/nxgt-devkit/commit/ae591776c357a0f1dd3a2d38c32ce7138416e364) Thanks [@SteveGT96](https://github.com/SteveGT96)! - The `@msw/playwright` peer range is now `>=0.6.7 <0.7`. `@msw/playwright`
  0.7.0 requires msw 3, so an install that resolved it beside msw 2 failed to
  load `@nxgt/playwright/msw` with `Cannot find package 'msw'`.

## 0.1.0

### Minor Changes

- [`936759f`](https://github.com/softistx/nxgt-devkit/commit/936759f2dcf1b27c3eefb8deabce2759ec11c750) Thanks [@SteveGT96](https://github.com/SteveGT96)! - First release: `defineAppConfig`, `BasePage` / `FormPage`, `authSetup` / `authFile` / `withLoginFixture`, `fillSettled` / `fillUntilEnabled`, `createMswTest`, and `storybookProject` with WebP preview capture for Storybook stories in Vitest browser mode.
  
  A `preview` story can set `parameters.previewCapture.width` to be laid out, and captured, at that width instead of the full viewport.

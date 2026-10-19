# @nxgt/playwright

## 0.9.5

### Patch Changes

- [#82](https://github.com/softistx/nxgt-devkit/pull/82) [`918f7a0`](https://github.com/softistx/nxgt-devkit/commit/918f7a0c238f9f7982625b16acfd663ded30f4a7) Thanks [@SteveGT96](https://github.com/SteveGT96)! - `expectTapTargets`: a target scrolled into view for the hit-area probe whose probe misses is probed once more two frames later, once the page's scroll listeners have moved their layers (a menu in a `fixed` popper that follows its anchor), and the page settles again after the scroll is put back. The last rows of a long page no longer fail against where an open menu was before the scroll. Only a miss under a layer a scroll listener can move (`fixed`, `sticky`, or `absolute` against the document) waits, a layer seen not to move is not waited for again, five waits in a row with nothing moving end the waits, and a retry never turns a reached target into a covered one.

## 0.9.4

### Patch Changes

- [#79](https://github.com/softistx/nxgt-devkit/pull/79) [`fff556a`](https://github.com/softistx/nxgt-devkit/commit/fff556a6ae92dae05cb3dc69e828602477d45c40) Thanks [@SteveGT96](https://github.com/SteveGT96)! - `expectTapTargets`: a floating layer over part of a hit area (an element with a `role` of `menu`, `listbox`, `dialog`, `alertdialog`, `tooltip`, `status` or `alert`, an open popover or `<dialog>`, positioned `fixed` / `absolute` or in the top layer, that does not hold the target) is measured through: what it put under the probe is made transparent to the pointer for the probe and put back, so a checkbox beside an open non-modal menu is judged on its real hit area. A neighbour without such a role, or in the flow (an inline `role="alert"` error), over part of the square still fails it; a target a layer hides whole stays covered and not judged.

## 0.9.3

### Patch Changes

- [#75](https://github.com/softistx/nxgt-devkit/pull/75) [`31aa17a`](https://github.com/softistx/nxgt-devkit/commit/31aa17a6d1eb6f03f9df2aba37283c38d4ee8eae) Thanks [@SteveGT96](https://github.com/SteveGT96)! - `expectTapTargets`: while a modal layer is open (a modal `<dialog>`, a shown `aria-modal="true"` element, or a body with `pointer-events: none`, as a modal Radix DropdownMenu leaves it), a control under `aria-hidden="true"` is out of reach and not measured, even where the layer does not cover it. The layer's own controls are still judged; `aria-hidden` with no modal layer open hides nothing from the check.

- [#77](https://github.com/softistx/nxgt-devkit/pull/77) [`83fff78`](https://github.com/softistx/nxgt-devkit/commit/83fff78121f86724de1a31d8e96413c1e8c81a63) Thanks [@SteveGT96](https://github.com/SteveGT96)! - Docs: `expectAccessible`'s `unstick` covers a sticky header too. The README, the a11y guide and the `target-size` troubleshooting entry name the header beside the bottom bar, and the entry gives axe's node message ("partially obscured") as the raw `accessibilityScan` result shows it.

## 0.9.2

### Patch Changes

- [#71](https://github.com/softistx/nxgt-devkit/pull/71) [`85deca3`](https://github.com/softistx/nxgt-devkit/commit/85deca35384105a74b8d4d7a4b909bec11bb2f94) Thanks [@SteveGT96](https://github.com/SteveGT96)! - `expectTapTargets`: an undersized control that another element still covers once scrolled to the middle, at the centre of each of its boxes and labels (a row checkbox under a toast or behind a modal menu's layer, the buttons of a toast stacked behind the front one, anything under a full-page sheet) is out of reach in that state and no longer judged, instead of being reported at its drawn size. A neighbour over part of a hit area still fails it; `hitArea: false` keeps the visible-box check.

## 0.9.1

### Patch Changes

- [#68](https://github.com/softistx/nxgt-devkit/pull/68) [`790e2f5`](https://github.com/softistx/nxgt-devkit/commit/790e2f50c66ebcd375452a7064658231b7405743) Thanks [@SteveGT96](https://github.com/SteveGT96)! - `expectTapTargets`: a control covered where it sits (under a form's sticky actions bar) is scrolled to the middle and probed again instead of failing at its own size; only a control still covered there fails.

## 0.9.0

### Minor Changes

- [#65](https://github.com/softistx/nxgt-devkit/pull/65) [`acdfec6`](https://github.com/softistx/nxgt-devkit/commit/acdfec61756b4b6915f1edc22b816babed5968be) Thanks [@SteveGT96](https://github.com/SteveGT96)! - `expectTapTargets` (and `checkScreen`'s `tapTargets`) now measure the real hit area, not only the visible box. A checkbox, switch, radio or close button drawn at 20px with an invisible 44px `::before` / `::after` (often under `@media (pointer: coarse)`) passes, as long as the pseudo-element is hit-testable: every point of a 5x5 grid over the `size` square (44px by default) centred on the control's box (with its labels, for a checkbox or radio) must hit the control, its descendants or its labels. A full `size` square of hit area must be on screen: at the viewport's edge the square is moved inside the viewport, not cut. A control off screen, or whose square sticks out of the viewport, is scrolled into view for the probe and the scroll positions (the window, every scrolled ancestor, through slots and shadow roots) are put back; the page's scroll listeners fire during the check. `hitArea: false` restores the previous behaviour, the visible box only. The failure message is unchanged.

## 0.8.1

### Patch Changes

- [#59](https://github.com/softistx/nxgt-devkit/pull/59) [`b89a2d5`](https://github.com/softistx/nxgt-devkit/commit/b89a2d5e918cb33180b8578b2dd0f948bd2505c8) Thanks [@SteveGT96](https://github.com/SteveGT96)! - `storybookProject({ capture, browsers })` with `webkit` now throws at config time, and the capture throws if a browser answers with a non-WebP image. WebKit cannot encode WebP: it silently returned PNG data, which was written under a `.webp` name. Capture with `chromium` or `firefox`.
  
  The capture also names an empty or oversized canvas (`toDataURL` answers `"data:,"`) with its width and height, instead of blaming the browser.

## 0.8.0

### Minor Changes

- [#47](https://github.com/softistx/nxgt-devkit/pull/47) [`1bb81b2`](https://github.com/softistx/nxgt-devkit/commit/1bb81b24cc2ad063008c6ac3a79ba1e23adf3539) Thanks [@SteveGT96](https://github.com/SteveGT96)! - `storybookProject({ browsers })` runs the stories in Chromium, Firefox and/or WebKit, one Vitest browser instance each (default `['chromium']`, so nothing changes). `executablePath` applies to the `chromium` instance only and throws when `browsers` has no `chromium`. New type `StorybookBrowser`. `capture` with more than one browser throws (they would write the same preview file). The returned project's `test.browser.provider` is now a bare `playwright()`: the Chromium `executablePath` moved to the `chromium` instance's own `provider` (the launched browser is the same), so code that reads `provider.launchOptions` on the project reads the instance instead.

- [#48](https://github.com/softistx/nxgt-devkit/pull/48) [`f99fe2b`](https://github.com/softistx/nxgt-devkit/commit/f99fe2bcdb81b5636836f42220e6429dc4efdeec) Thanks [@SteveGT96](https://github.com/SteveGT96)! - `expectTapTargets`, `formatTapTargets(found, viewport, { size, max })` and `DEFAULT_TAP_TARGETS` in `/helpers` (and the root), with the types `TapTargetOptions` and `SmallTapTarget`: links, buttons and controls of at least 44x44 CSS pixels, and `checkScreen`'s `tapTargets` option (off by default; `true`, an options object, or a function of the test for phone-only). WCAG 2.5.8's 24px stays axe's `target-size`, which `expectAccessible` already runs. An empty `targets`, or an `include` matching no element, throws a named error. The size is the element's border box: grow it with padding or `min-width` / `min-height`.

- [#46](https://github.com/softistx/nxgt-devkit/pull/46) [`90797a6`](https://github.com/softistx/nxgt-devkit/commit/90797a6d23588c909a18356cdc4e7e4eb03061f3) Thanks [@SteveGT96](https://github.com/SteveGT96)! - `expectNoTextOverflow` and `formatTextOverflow(found, viewport, { max })` in `/helpers` (and the root), with the types `TextOverflowOptions` and `OverflowingText`, and `checkScreen`'s `textOverflow` option (off by default; `true`, an options object, or a function of the test for phone-only). An `include` matching no element throws instead of passing.

## 0.7.0

### Minor Changes

- [#38](https://github.com/softistx/nxgt-devkit/pull/38) [`2ed2849`](https://github.com/softistx/nxgt-devkit/commit/2ed2849ab6f6434c701a43776f6024a72252cb78) Thanks [@SteveGT96](https://github.com/SteveGT96)! - `@nxgt/playwright/a11y`: `expectFocusAboveActions` and `expectFieldsAboveActions` check WCAG 2.4.11 (Focus Not Obscured), which axe does not: the focused control, and its field's error, end above the sticky form actions, and Tab through the form up to the submit keeps each control clear of the bar. Options `actions`, `field`, `until` and `limit`; the `a11y` fixture carries both as `focusAboveActions` and `fieldsAboveActions`.

- [#42](https://github.com/softistx/nxgt-devkit/pull/42) [`e80dd7d`](https://github.com/softistx/nxgt-devkit/commit/e80dd7d9bda9b98b226d7023742ae25a0d5bce5c) Thanks [@SteveGT96](https://github.com/SteveGT96)! - Add `checkScreen` to `@nxgt/playwright/screens`: one call per screen that waits for web fonts and motion, saves the screen when the run saves them (before the checks, so a failing one still leaves the image), then runs the accessibility scan and the no-sideways-scroll check. `a11y` takes `expectAccessible`'s options, a function that replaces the scan, or `false`; `scroller` is a selector or a function of the test (a phone project can name another one); `@axe-core/playwright` is loaded only when the default scan runs.

- [#37](https://github.com/softistx/nxgt-devkit/pull/37) [`663eac5`](https://github.com/softistx/nxgt-devkit/commit/663eac5ea7ed1c5eb23b40fffb044609d22c21c3) Thanks [@SteveGT96](https://github.com/SteveGT96)! - Add `@nxgt/playwright/csp`: `watchCsp` and `withCspGuard` / `cspTest` fail a test whose pages meet a Content-Security-Policy refusal, and `expectNoncedPage` checks that a page's `script-src` names a fresh nonce that every script and module preload carries.

- [#39](https://github.com/softistx/nxgt-devkit/pull/39) [`cb27263`](https://github.com/softistx/nxgt-devkit/commit/cb272631d80353ba26bda73d21711a4d97d53759) Thanks [@SteveGT96](https://github.com/SteveGT96)! - The `@playwright/test` peer range moves from `^1.55.0` to `^1.61.0`. Below 1.61, `context.setOffline(true)` does not reach a service worker's own fetches, so after `goOffline(page)` (`@nxgt/playwright/pwa`) a fetch of an uncached URL still answers `200`. Upgrade `@playwright/test` to 1.61 or newer.

## 0.6.0

### Minor Changes

- [#35](https://github.com/softistx/nxgt-devkit/pull/35) [`af7fb47`](https://github.com/softistx/nxgt-devkit/commit/af7fb47a4f96ee623e8f6ebd6d82dd1ea5bc0181) Thanks [@SteveGT96](https://github.com/SteveGT96)! - `expectAccessible` and `accessibilityScan` put sticky form actions (`[data-slot="form-actions"]`) back in the flow while axe runs, then restore them, so `target-size` no longer reports a control half covered by the bar wherever the page stops scrolling. Add your own bars with the new `unstick` option (`[...DEFAULT_UNSTICK, '.app-bottom-bar']`); `unstick: []` turns it off.

## 0.5.1

### Patch Changes

- [#21](https://github.com/softistx/nxgt-devkit/pull/21) [`6c13c0c`](https://github.com/softistx/nxgt-devkit/commit/6c13c0cc978a34a987860f54e6aee4fc5cb6fd7d) Thanks [@SteveGT96](https://github.com/SteveGT96)! - The `typescript` peer accepts TypeScript 7 (`^6.0.3 || ^7.0.0`); the package builds and typechecks under 7.0.2.

## 0.5.0

### Minor Changes

- [#13](https://github.com/softistx/nxgt-devkit/pull/13) [`a1173f7`](https://github.com/softistx/nxgt-devkit/commit/a1173f75e182a798bfecc7cc74fbee1789237644) Thanks [@SteveGT96](https://github.com/SteveGT96)! - Add `@nxgt/playwright/mock-server`: `createMockServerTest(base, { path })` gives a
  `mockServer` fixture (`reset`, `fail`, `scenario(name, args)`, `use(...overrides)`)
  and a `serverMocks` option that drive the mocks living in an SSR/BFF app's
  server over HTTP, with an automatic reset before and after each test. It needs
  only `@playwright/test`. The `/msw` peers widen to `msw ^2.12.10 || ^3.0.0` and
  `@msw/playwright >=0.6.7 <0.8`, measured against msw 2.15 with 0.6.7 and msw
  3.0.3 with 0.7.0.

## 0.4.0

### Minor Changes

- [#8](https://github.com/softistx/nxgt-devkit/pull/8) [`6cb4bd4`](https://github.com/softistx/nxgt-devkit/commit/6cb4bd4bc207345b85ff7fdb4a084c74eb6082d5) Thanks [@SteveGT96](https://github.com/SteveGT96)! - PWA end-to-end helpers in `@nxgt/playwright/pwa`: a production-build run, offline, a new worker version and what the caches keep.
  
  - **`pwaProject(options)`**: the `defineAppConfig` options of a run that is the PWA project alone — `bun run build && bun run start` (both configurable) on a port of its own with `PORT` set and no mocks, awaited on `readyPath`, and one `pwa` project in Chromium with service workers allowed, its specs in `./playwright/pwa`. **`isPwaRun()`**: `--project pwa` (the same answer in the workers) or `PWA=1`.
  - **`goOffline(page, options?)`** and **`goOnline(page)`**: `context.setOffline`, once a service worker controls the page (`{ worker: false }` for an app without one).
  - **`nextWorkerVersion(page, { file })`**: a new version of the worker, as a deploy would make one — the script on disk edited, `registration.update()`, the file restored — resolving once the new worker has installed, and saying why when no new worker appears or it fails to install.
  - **`fillCaches(page, names)`** puts one entry in each named cache; **`expectOnlyCaches(page, keep)`** fails unless only the caches `keep` names (exact names, patterns or predicates) are left, naming the extra and the missing ones. `cacheProblems` and `filledCacheUrl` are the pure parts.
  - `cachedUrls` (and so `expectNotCached`) now says when the page has no Cache Storage (`about:blank`, a non-secure origin) instead of failing on `caches`.
  
  Nothing changes for an existing suite: every addition is opt-in.

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

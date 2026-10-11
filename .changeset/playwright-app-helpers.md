---
'@nxgt/playwright': minor
---

Helpers for app suites that check every screen: hydration-aware navigation, a page at rest, full-page screens and PWA caches.

- **`withHydration(test, options?)`** (`/helpers`): `page.goto` on every page of the context resolves once the page is hydrated — its marker holds, `<html data-hydrated>` by default, or any selector or in-page function — and two frames later. A response that is not a document is returned at once; `test.use({ hydration: false })` turns it off for a block. `hydrated(page, options?)` waits on a page already open; `hydrationWarnings(page)` collects the console's hydration-mismatch warnings.
- **`@nxgt/playwright/react-router`** (new subpath, no new peer): `reactRouterHydrated`, a marker that needs nothing from a React Router app, and `elementHydrated(locator)` for an element React hydrates later.
- **`settled(page)`** and **`nextFrames(page, count?)`**: wait for every finite animation and transition to end, and for a render's effects to run. **`toastsGone(page, text, { selector? })`**: the toast shows, the pointer moves off it, then no toast is left (sonner's by default). **`isMobileProject(testInfo)`**.
- **`expectNoHorizontalScroll(page, { scroller })`**: also checks an inner scroll container — an app shell whose `main` scrolls — naming it and its widest elements.
- **`@nxgt/playwright/screens`** (new subpath): `saveScreen(page, testInfo, name, options?)` saves `<dir>/<project>/<name>.png` full page, stretching the viewport so an inner-scrolling shell is captured whole; `savingScreens(testInfo)`. **`defineAppConfig({ screens })`** turns saving on when `SCREENS=1` and empties the folder first through a packaged global setup.
- **`selectedProjects()`** (`/config`): the `--project` names of the command line, the same in the runner and in its workers, which load the config without it (`PW_PROJECTS`).
- **`@nxgt/playwright/pwa`** (new subpath): `serviceWorkerControlled(page)`, `cachedUrls(page)` and `expectNotCached(page, url)`.

Nothing changes for an existing suite: every addition is opt-in, and `expectNoHorizontalScroll` without `scroller` checks what it did.

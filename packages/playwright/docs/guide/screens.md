# Screens

Save a full-page PNG of what a page looks like, per project, for a review of
the design on desktop and phone: `saveScreen` and `savingScreens` from
`@nxgt/playwright/screens` (also the root), switched on by
`defineAppConfig({ screens })`. `checkScreen` does the whole round for a
screen in one call: save, accessibility scan, no sideways scroll.

```ts
// playwright.config.ts
import { defineAppConfig } from '@nxgt/playwright/config';

export default defineAppConfig({ port: 5173, mobile: true, screens: true });
```

```ts
// playwright/e2e/screens.spec.ts
import { test } from '@playwright/test';
import { saveScreen } from '@nxgt/playwright/screens';

test('projects', async ({ page }, testInfo) => {
	await page.goto('/projects');
	await saveScreen(page, testInfo, 'projects');
});
```

```bash
SCREENS=1 bunx playwright test e2e/screens --project=chromium --project=mobile-chromium
# playwright/screenshots/chromium/projects.png
# playwright/screenshots/mobile-chromium/projects.png
```

## `saveScreen`

```ts
type SaveScreenOptions = {
	dir?: string;
	maxGrowth?: number; // default 5
	screenshot?: Omit<PageScreenshotOptions, 'path'>;
	viewport?: { width: number; height: number };
};

function saveScreen(page: Page, testInfo: TestInfo, name: string, options?: SaveScreenOptions): Promise<string>;
```

It saves `<dir>/<project name>/<name>.png` and returns the path. `name` may
hold folders (`'auth/sign-in'`); a project without a name saves under
`default/`.

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `dir` | `string` | the config's `screens` folder, else `./playwright/screenshots` | The screens folder, relative to the config file. |
| `maxGrowth` | `number` | `5` | How many times the viewport may grow to show nested scrolling content. |
| `screenshot` | `PageScreenshotOptions` without `path` | `{}` | Passed to `page.screenshot`, over the defaults below. |
| `viewport` | `{ width, height }` | the page's own | Resizes the page for the save, then restores the previous viewport in a `finally`, so a save that throws restores it too. |

A plain `fullPage` screenshot stops at the fold of an app shell: a box as
tall as the viewport whose `main` scrolls inside it. `saveScreen` stretches
the viewport until no inner scroll container hides content (only boxes at
least 200px tall count, so a short list in a card is left alone), takes the
shot with `fullPage: true`, `animations: 'disabled'` and the caret hidden,
then puts the viewport back and waits for frames and [`settled`](helpers.md#nextframes-and-settled).
Whatever else moves (data, the clock) is as deterministic as the spec makes it.

### A phone screen inside a desktop pass

Phone layouts are judged from phone-size screenshots taken during the desktop
run. `viewport` replaces the hand-written resize, save, restore:

```ts
await saveScreen(page, testInfo, 'items-phone', {
	viewport: { width: 390, height: 844 },
});
```

`withViewport(page, viewport, run)` is the same resize-and-restore, exported
for code of your own: it resizes, waits for frames, runs `run`, then restores
the previous viewport in a `finally`. Without a `viewport` it only runs `run`.
A page configured with `viewport: null` has no previous size to restore, so it
stays at the size you asked for.

## `savingScreens`

```ts
function savingScreens(testInfo: TestInfo): boolean;
```

True when the run saves screens (the `screens` variable is `1`). Use it to
save only then, and run the same specs as plain checks otherwise.

## `defineAppConfig({ screens })`

```ts
screens?: boolean | { dir?: string; env?: string };
```

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `screens` | `boolean \| { dir?, env? }` | `false` | `true` takes both defaults below. |
| `dir` | `string` | `./playwright/screenshots` | The folder, relative to the config. |
| `env` | `string` | `SCREENS` | The variable that, set to `1`, makes the run save screens. |

The option stores `{ dir, enabled }` in the config's `metadata.nxgtScreens`
(merged with `overrides.metadata`, never dropped), which `saveScreen` and
`savingScreens` read in the workers. On a run where the variable is `1` it
also sets a `globalSetup` that empties the folder first, so it holds this run's
screens only, none of a screen since renamed.

```ts
defineAppConfig({
	port: 5173,
	screens: { dir: './playwright/screens', env: 'DESIGN_SCREENS' },
});
```

Three things to know:

- `overrides.globalSetup` replaces the screens' one. Playwright accepts an
  array: list both, or empty the folder yourself.
- The default folder is also the one `BasePage.screenshot()` writes to
  (`playwright/screenshots`), so a `SCREENS=1` run empties those too. Give the
  screens a `dir` of their own when you keep both.
- Add the folder to `.gitignore`.

## One call per screen: `checkScreen`

`checkScreen(page, testInfo, name, options?)` is what a screen goes through, in
this order: web fonts loaded (`document.fonts.ready`), motion over (`settled`),
the screen saved when the run saves them (before the checks, so a failing one
still leaves the image to look at), the accessibility scan, the
no-sideways-scroll check, then, when asked, the text-overflow check and the
tap-target check (last).

```ts
// playwright/e2e/quality-students.spec.ts
import { test } from '@playwright/test';
import { isMobileProject } from '@nxgt/playwright/helpers';
import { checkScreen } from '@nxgt/playwright/screens';

test.use({ locale: 'en-US', reducedMotion: 'reduce' });

test('students list', async ({ page }, testInfo) => {
	await page.clock.install({ time: new Date('2026-01-15T09:00:00Z') });
	await page.goto('/students');
	await checkScreen(page, testInfo, 'students-list', {
		// A phone project scrolls the table inside its wrapper.
		scroller: (info) => (isMobileProject(info) ? '[data-slot="table-wrapper"]' : undefined),
	});
});
```

| Option | Default | What it does |
| --- | --- | --- |
| `a11y` | `expectAccessible(page, { testInfo })` | An options object is `expectAccessible`'s own (`exclude`, `disableRules`, …). A function `(page) => Promise<unknown>` replaces the scan, for an app's wrapper around `expectAccessible`. `false` skips it. |
| `scroller` | none | The inner scroll container `expectNoHorizontalScroll` checks too: a selector or a locator, or a function of the `testInfo` returning one (or `undefined` for the document only). |
| `horizontalScroll` | `true` | `false` skips the sideways-scroll check. |
| `textOverflow` | `false` | `true` runs `expectNoTextOverflow` on the whole body, an options object (`include`, `exclude`, `max`) is its own, and a function of the `testInfo` returning either picks per project, as `tapTargets` does. Off by default: a design may clip a text on purpose, and a screen opts in. |
| `tapTargets` | `false` | `true` runs `expectTapTargets` (44x44px) in every project, an options object (`size`, `spacing`, `hitArea`, `targets`, `include`, `exclude`, `max`) is its own, and a function of the `testInfo` returning either picks per project: `(info) => isMobileProject(info)` for phones only. Off by default: a desktop layout has small targets on purpose. WCAG 2.5.8's 24px is axe's `target-size`, already in the default `a11y` scan. Runs last. |
| `max` | `5` | How many offending elements the sideways-scroll message lists (and the text-overflow and tap-target ones', unless `textOverflow` or `tapTargets` sets its own). |
| `viewport` | the page's own | `{ width, height }`: the page is resized for the whole call, so the save and every check (sideways scroll, axe, text overflow, tap targets) judge that size, then the previous viewport is restored in a `finally`, also when a check throws. Wins over `save.viewport`. |
| `save` | none | `saveScreen`'s options (`dir`, `maxGrowth`, `screenshot`), used when the run saves screens. |

`@axe-core/playwright` is needed when the scan runs (the default, or an options
object), and loaded only then: with `a11y: false` or a function, `/screens` needs nothing beyond
`@playwright/test`. A failure is the failure of the check that raised it
(`expectAccessible`'s, `expectNoHorizontalScroll`'s, `expectNoTextOverflow`'s or `expectTapTargets`'s message), unchanged.

Phone-only tap targets:

```ts
await checkScreen(page, testInfo, 'students-list', {
	tapTargets: (info) => isMobileProject(info),
});
```

A phone screen inside a desktop pass, with the phone checks:

```ts
await checkScreen(page, testInfo, 'students-list-phone', {
	viewport: { width: 390, height: 844 },
	tapTargets: true,
});
```

## A check you compose yourself

Compose it from the parts when a screen needs a step `checkScreen` lacks, or
the steps in another order; otherwise its options (`a11y`, `scroller`, …) are
enough. Save first,
so a failing check still leaves the image to look at, then check:

```ts
// playwright/support/check-screen.ts
import type { Page, TestInfo } from '@playwright/test';
import { expectAccessible } from '@nxgt/playwright/a11y';
import { expectNoHorizontalScroll, settled } from '@nxgt/playwright/helpers';
import { saveScreen, savingScreens } from '@nxgt/playwright/screens';

export async function myCheckScreen(page: Page, testInfo: TestInfo, name: string) {
	await page.evaluate(() => document.fonts.ready);
	await settled(page);
	if (savingScreens(testInfo)) await saveScreen(page, testInfo, name);
	await expectAccessible(page);
	await expectNoHorizontalScroll(page, { scroller: 'main' });
}
```

```json
{ "scripts": { "e2e:screens": "SCREENS=1 playwright test e2e/quality- --project=chromium --project=mobile-chromium" } }
```

If the build of the package is broken, `defineAppConfig` throws
`defineAppConfig: the screens' global setup is missing at <path>. Reinstall @nxgt/playwright.`
See [troubleshooting.md](../troubleshooting.md#defineappconfig-the-screens-global-setup-is-missing-at-path).

Next: [config.md](config.md) for the rest of `defineAppConfig`.

# Screens

Save a full-page PNG of what a page looks like, per project, for a review of
the design on desktop and phone: `saveScreen` and `savingScreens` from
`@nxgt/playwright/screens` (also the root), switched on by
`defineAppConfig({ screens })`.

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

A plain `fullPage` screenshot stops at the fold of an app shell: a box as
tall as the viewport whose `main` scrolls inside it. `saveScreen` stretches
the viewport until no inner scroll container hides content (only boxes at
least 200px tall count, so a short list in a card is left alone), takes the
shot with `fullPage: true`, `animations: 'disabled'` and the caret hidden,
then puts the viewport back and waits for frames and [`settled`](helpers.md#nextframes-and-settled).
Whatever else moves (data, the clock) is as deterministic as the spec makes it.

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
still leaves the image to look at), the accessibility scan, then the
no-sideways-scroll check.

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
| `scroller` | none | The inner scroll container `expectNoHorizontalScroll` checks too: a selector, or a function of the `testInfo` returning one (or `undefined` for the document only). |
| `horizontalScroll` | `true` | `false` skips the sideways-scroll check. |
| `max` | `5` | How many offending elements the sideways-scroll message lists. |
| `save` | none | `saveScreen`'s options (`dir`, `maxGrowth`, `screenshot`), used when the run saves screens. |

`@axe-core/playwright` is loaded only when the default or an options-object scan
runs: with `a11y: false` or a function, `/screens` needs nothing beyond
`@playwright/test`. A failure is the failure of the check that raised it
(`expectAccessible`'s or `expectNoHorizontalScroll`'s message), unchanged.

## A check you compose yourself

When the screen goes through other steps, build it from the parts. Save first,
so a failing check still leaves the image to look at, then check:

```ts
// playwright/support/check-screen.ts
import type { Page, TestInfo } from '@playwright/test';
import { expectAccessible } from '@nxgt/playwright/a11y';
import { expectNoHorizontalScroll, settled } from '@nxgt/playwright/helpers';
import { saveScreen, savingScreens } from '@nxgt/playwright/screens';

export async function checkScreen(page: Page, testInfo: TestInfo, name: string) {
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

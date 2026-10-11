# @nxgt/playwright

The Playwright boilerplate every app ends up writing, written once: a shared
`playwright.config.ts`, `BasePage` and `FormPage` page objects, sign-in and
storage-state fixtures, msw network fixtures, navigation and fills that wait
for hydration, waits for a page at rest, axe accessibility checks, phone
projects and a no-sideways-scroll check, full-page screens of every state,
PWA cache checks, and Storybook stories run as Vitest browser tests that can also capture WebP
previews of your components.

## Install

```bash
bun add -d @nxgt/playwright @playwright/test
```

Every peer is optional except `typescript` (`^6.0.3`); install the ones for the
subpaths you import:

| Subpath | Peers to add |
| --- | --- |
| `.`, `/config`, `/pages`, `/auth`, `/helpers`, `/screens`, `/pwa`, `/react-router` | `@playwright/test` (`^1.55.0`) |
| `/a11y` | `@playwright/test`, `@axe-core/playwright` (`>=4.10.0 <5`) |
| `/msw` | `@playwright/test`, `msw` (`^2.12.10`), `@msw/playwright` (`>=0.6.7 <0.7`) |
| `/storybook`, `/storybook/capture`, `/storybook/setup` | `vitest` (`^4.0.0`), `@vitest/browser-playwright` (`^4.0.0`), `@storybook/addon-vitest` (`>=10.3.0 <11`), and `playwright` itself (required by `@vitest/browser-playwright`) |

```bash
bun add -d @axe-core/playwright                                       # for /a11y
bun add -d msw @msw/playwright                                        # for /msw
bun add -d vitest @vitest/browser-playwright @storybook/addon-vitest playwright  # for /storybook
```

The package is ESM only and its declarations use extensionless relative
imports, so the consumer's `tsconfig.json` needs
`"moduleResolution": "bundler"` (the Vite and Bun default).

## Subpaths

| Subpath | Exports | Runs in |
| --- | --- | --- |
| `@nxgt/playwright` | everything from `/config`, `/pages`, `/auth`, `/helpers`, `/screens`, `/pwa` | Node |
| `@nxgt/playwright/config` | `defineAppConfig`, `selectedProjects`, `projectsFromArgv`, `PROJECTS_ENV`; types `AppConfigOptions`, `Browser`, `DeviceName`, `MobileProject` | Node |
| `@nxgt/playwright/pages` | `BasePage`, `FormPage`, `DEFAULT_SCREENSHOT_DIR`, option types | Node |
| `@nxgt/playwright/auth` | `authSetup`, `authFile`, `withLoginFixture`, `DEFAULT_AUTH_DIR` | Node |
| `@nxgt/playwright/helpers` | `withHydration`, `hydrated`, `hydrationWarnings`, `DEFAULT_HYDRATION_MARKER`, `settled`, `nextFrames`, `toastsGone`, `isMobileProject`, `fillSettled`, `fillUntilEnabled`, `expectNoHorizontalScroll`, `formatOverflow`, `screenshotName` | Node |
| `@nxgt/playwright/screens` | `saveScreen`, `savingScreens`, `DEFAULT_SCREENS_DIR` | Node |
| `@nxgt/playwright/pwa` | `serviceWorkerControlled`, `cachedUrls`, `expectNotCached` | Node |
| `@nxgt/playwright/react-router` | `reactRouterHydrated`, `elementHydrated` | Node |
| `@nxgt/playwright/a11y` | `expectAccessible`, `accessibilityScan`, `withA11y`, `formatViolations`, `DEFAULT_TAGS`; types `A11yOptions`, `DisabledRule`, `AccessibilityResults` | Node |
| `@nxgt/playwright/msw` | `createMswTest`, `MswFixtures`, `MswTestOptions` | Node |
| `@nxgt/playwright/storybook` | `storybookProject`, `componentId`, `titleToComponentId`; types `StorybookProjectOptions`, `PreviewCaptureOptions`, `StoryPreviewParameters` | Node (Vitest config) |
| `@nxgt/playwright/storybook/capture` | `capturePreview` | **browser only** |
| `@nxgt/playwright/storybook/setup` | an `afterEach(capturePreview)` side effect | **browser only** |

The root barrel does not re-export `/a11y`, `/msw` or `/storybook`, so an app
without those peers can still import it, nor the `/react-router` adapter.

## Usage

### Config

```ts
// playwright.config.ts
import { defineAppConfig } from '@nxgt/playwright/config';

export default defineAppConfig({ port: 5174, setup: true });
```

Specs in `./playwright/e2e`, Chromium, Firefox, Edge and Chrome, `data-pw` as
the test id attribute, `bun dev -m test --port 5174` started for you (reused
locally, fresh on CI), and an auth `setup` project every browser depends on.
All of it is an option: [docs/guide/config.md](docs/guide/config.md).

Add phones with `mobile`: `true` is a Pixel 7 on Chromium, named
`mobile-chromium`, after the desktop browsers and depending on `setup` like
them.

```ts
export default defineAppConfig({
	port: 5174,
	setup: true,
	browsers: ['chromium'],
	mobile: ['Pixel 7', 'iPhone 14'], // mobile-chromium, mobile-webkit (needs WebKit installed)
});
```

Playwright's workers load the config again **without the command line**, so a
config that reads `process.argv` builds one thing in the runner and another in
each worker. `selectedProjects()` gives both the `--project` names the command
line selected:

```ts
import { defineAppConfig, selectedProjects } from '@nxgt/playwright/config';

// `playwright test --project=pwa`: a production build on a port of its own.
const pwa = selectedProjects().includes('pwa');

export default defineAppConfig({
	port: pwa ? 5274 : 5273,
	browsers: pwa ? [] : ['chromium', 'firefox'],
	...(pwa ? { webServer: { command: 'bun run build && PORT=5274 bun run start', url: 'http://localhost:5274' } } : {}),
});
```

### Pages

```ts
// playwright/pages/sign-in.page.ts
import type { Locator, Page } from '@playwright/test';
import { fillUntilEnabled } from '@nxgt/playwright/helpers';
import { FormPage } from '@nxgt/playwright/pages';

export type Account = { email: string; password: string };

export class SignInPage extends FormPage {
	readonly email: Locator;
	readonly password: Locator;

	constructor(page: Page) {
		super(page, '/login');
		this.email = page.getByTestId('email');
		this.password = page.getByTestId('password');
	}

	async signIn({ email, password }: Account) {
		await fillUntilEnabled(
			[
				[this.email, email],
				[this.password, password],
			],
			this.submitButton,
		);
		await this.submit();
	}
}
```

`BasePage` gives `goto()`, `expectTitle()`, `waitForURL()` and a
`screenshot()` named after the path; `FormPage` adds `submitButton` (test id
`submit`) and `submit()`.

### Auth

Sign in once per account in a setup project, then reuse the saved storage
state:

```ts
// playwright/config/auth.setup.ts
import { test } from '@playwright/test';
import { authSetup } from '@nxgt/playwright/auth';
import { SignInPage } from '../pages/sign-in.page';

authSetup(test, {
	accounts: {
		user: { email: 'user@example.com', password: 'user-password' },
		admin: { email: 'admin@example.com', password: 'admin-password' },
	},
	signIn: async (page, account) => {
		const signIn = new SignInPage(page);
		await signIn.goto();
		await signIn.signIn(account);
	},
});
```

```ts
// playwright/e2e/projects.spec.ts
import { expect, test as base } from '@playwright/test';
import { authFile, withLoginFixture } from '@nxgt/playwright/auth';
import { SignInPage } from '../pages/sign-in.page';

// Adds `login`: the sign-in page, already open.
const test = withLoginFixture(base, SignInPage);

test.describe('signed in', () => {
	test.use({ storageState: authFile('user') }); // playwright/.auth/user.json

	test('lists projects', async ({ page }) => {
		await page.goto('/projects');
		await expect(page.getByTestId('projects')).toBeVisible();
	});
});

test('signs in', async ({ login, page }) => {
	await login.signIn({ email: 'user@example.com', password: 'user-password' });
	await expect(page).toHaveURL('/');
});
```

### Hydration

A server-rendered control is visible and clickable before the framework has
hydrated it, and a click then is lost — a checkbox that never toggles, a menu
that never opens. `withHydration` makes `page.goto` (every page of the
context, page objects included) resolve once the page is hydrated. The app
says so with a marker, `<html data-hydrated>` by default:

```tsx
// the app's root component
useEffect(() => {
	document.documentElement.dataset.hydrated = '';
}, []);
```

```ts
// playwright/support/test.ts — every spec imports `test` from here
import { test as base } from '@playwright/test';
import { withHydration } from '@nxgt/playwright/helpers';

export const test = withHydration(base);
export { expect } from '@playwright/test';
```

```ts
test('toggles archived', async ({ page }) => {
	await page.goto('/projects'); // resolves once hydrated
	await page.getByRole('checkbox', { name: 'Archived' }).check();
});

test.describe('static pages', () => {
	test.use({ hydration: false }); // the plain goto
});
```

A React Router app needs no marker of its own: the adapter reads the router
and React. `elementHydrated` waits for one element shown later (a dialog's
button):

```ts
import { withHydration } from '@nxgt/playwright/helpers';
import { elementHydrated, reactRouterHydrated } from '@nxgt/playwright/react-router';

export const test = withHydration(base, { marker: reactRouterHydrated });

await elementHydrated(page.getByRole('button', { name: 'Continue' }));
```

`hydrated(page, options?)` waits on a page already open, and
`hydrationWarnings(page)` collects the console's hydration-mismatch warnings
(call it before `goto`, expect `[]` after). See
[docs/guide/hydration.md](docs/guide/hydration.md).

### A page at rest

`settled(page)` resolves once every animation and transition that ends has
ended (a spinner is left running); `nextFrames(page, count = 2)` once React's
commit and its effects have run. Call them before an axe scan, which reads
colours mid-fade, or a screenshot:

```ts
import { nextFrames, settled } from '@nxgt/playwright/helpers';

await page.getByRole('button', { name: 'Open menu' }).click();
await settled(page);
await expectAccessible(page);
```

`toastsGone(page, text)` waits for the toast saying `text` to show, then for
every toast to go, moving the pointer off it first (a pointer resting on a
toast pauses it). The default selector is sonner's, `[data-sonner-toast]`:

```ts
import { toastsGone } from '@nxgt/playwright/helpers';

await page.getByRole('button', { name: 'Save' }).click();
await toastsGone(page, 'Saved');
await page.getByRole('button', { name: 'Next' }).click(); // no toast over it

await toastsGone(page, /saved/i, { selector: '[role="status"]' }); // another library
```

### Helpers

A server-rendered input can be filled before the framework hydrates it; when
it does, a controlled input is reset to its initial value and the fill is
silently lost. `fillSettled` fills, waits, and retries until the value
survives; `fillUntilEnabled` does the same for a whole form and its submit
button, which enables on the first fill and is disabled again by the reset.

```ts
import { expect, test } from '@playwright/test';
import { fillSettled, fillUntilEnabled } from '@nxgt/playwright/helpers';

test('creates a project', async ({ page }) => {
	await page.goto('/projects/new');
	await fillSettled(page.getByTestId('search'), 'Ada');
	await fillUntilEnabled(
		[[page.getByTestId('name'), 'Apollo']],
		page.getByTestId('submit'),
	);
	await page.getByTestId('submit').click();
});
```

On a phone project, check the layout does not scroll sideways; the failure
names the widest elements past the edge:

```ts
import { expectNoHorizontalScroll } from '@nxgt/playwright/helpers';

test('fits a phone', async ({ page }) => {
	await page.goto('/projects');
	await expectNoHorizontalScroll(page);
});
```

An app shell as tall as the viewport, whose `main` scrolls, never widens the
document: name the scroll container with `scroller` to check it as well (a
page without it, such as an error page, checks the document only).
`isMobileProject(testInfo)` tells a phone project:

```ts
import { expectNoHorizontalScroll, isMobileProject } from '@nxgt/playwright/helpers';

test('fits', async ({ page }, testInfo) => {
	await page.goto('/projects');
	await expectNoHorizontalScroll(page, { scroller: 'main' });
	if (isMobileProject(testInfo)) await page.getByRole('button', { name: 'Open menu' }).click();
});
```

### Screens

Saves every screen of a run, full page, under `<dir>/<project>/<name>.png`,
to be looked at before a pull request. An app shell whose content scrolls
inside it is captured whole: the viewport is stretched to the content for the
shot, then put back. With `screens`, a run whose `SCREENS` is `1` saves them,
in a folder emptied first:

```ts
// playwright.config.ts
export default defineAppConfig({ port: 5174, mobile: true, screens: true }); // ./playwright/screenshots
```

```ts
// playwright/e2e/projects.spec.ts
import { expectAccessible } from '@nxgt/playwright/a11y';
import { settled } from '@nxgt/playwright/helpers';
import { saveScreen, savingScreens } from '@nxgt/playwright/screens';

test('projects', async ({ page }, testInfo) => {
	await page.goto('/projects');
	await settled(page);
	if (savingScreens(testInfo)) await saveScreen(page, testInfo, 'projects');
	await expectAccessible(page);
});
```

```bash
SCREENS=1 bunx playwright test   # playwright/screenshots/chromium/projects.png, …/mobile-chromium/…
```

See [docs/guide/screens.md](docs/guide/screens.md).

### PWA caches

For a service worker's specs, against a build that registers it:
`serviceWorkerControlled` waits for it to control the page, `cachedUrls` lists
every Cache Storage entry by cache, and `expectNotCached` fails when a URL
that must never be kept is:

```ts
import { cachedUrls, expectNotCached, serviceWorkerControlled } from '@nxgt/playwright/pwa';

test('keeps no signed-in page', async ({ page }) => {
	await page.goto('/');
	await serviceWorkerControlled(page);
	expect(await cachedUrls(page)).toHaveProperty('precache-v1');
	await expectNotCached(page, /^\/account/);
});
```

See [docs/guide/pwa.md](docs/guide/pwa.md).

### Accessibility

`expectAccessible` runs axe with the WCAG 2.2 A/AA tags and fails with each
violated rule, its impact, help link and first nodes; the full report is
attached to the test.

```ts
import { expect, test } from '@playwright/test';
import { expectAccessible } from '@nxgt/playwright/a11y';

test('projects page is accessible', async ({ page }) => {
	await page.goto('/projects');
	await expect(page.getByTestId('projects')).toBeVisible();
	await expectAccessible(page, {
		exclude: '#chat-widget',
		disableRules: [{ rule: 'color-contrast', reason: 'brand palette, tracked in #42' }],
	});
});
```

A disabled rule without a `reason` is a type error. `accessibilityScan`
returns the results without asserting; `withA11y(test)` adds an `a11y`
fixture. See [docs/guide/a11y.md](docs/guide/a11y.md).

### msw

```ts
// playwright/config/playwright.setup.ts
import { createMswTest } from '@nxgt/playwright/msw';
import { HttpResponse, http } from 'msw';

let projects = [{ id: 1, name: 'Apollo' }];

export const test = createMswTest(
	[http.get('*/api/projects', () => HttpResponse.json(projects))],
	{ onReset: () => (projects = [{ id: 1, name: 'Apollo' }]) },
);
export { expect } from '@playwright/test';
```

```ts
// playwright/e2e/projects.spec.ts
import { HttpResponse, http } from 'msw';
import { expect, test } from '../config/playwright.setup';

test.describe('empty', () => {
	// Replaces the default handlers for this block.
	test.use({
		handlers: [http.get('*/api/projects', () => HttpResponse.json([]))],
	});

	test('shows the empty state', async ({ page }) => {
		await page.goto('/projects');
		await expect(page.getByTestId('empty')).toBeVisible();
	});
});

test('shows a server error', async ({ page, network }) => {
	// Takes precedence over the defaults, for this test only.
	network.use(
		http.get('*/api/projects', () => new HttpResponse(null, { status: 500 })),
	);
	await page.goto('/projects');
	await expect(page.getByRole('alert')).toBeVisible();
});
```

### Storybook

```ts
// vite.config.ts
import { storybookProject } from '@nxgt/playwright/storybook';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			{ extends: true, test: { name: 'unit', environment: 'node' } },
			storybookProject(), // every story renders in Chromium
			storybookProject({ capture: true }), // stories tagged `preview` → docs/previews/*.webp
		],
	},
});
```

```jsonc
// package.json
"scripts": {
	"test:stories": "vitest run --project storybook",
	"docs:previews": "vitest run --project previews"
}
```

Tag one story per component; its preview is saved as
`docs/previews/<component id>.webp` (`Form fields/TextField` →
`form-fields-textfield.webp`), cropped to what is painted:

```tsx
export const Default: Story = { args: { label: 'Name' }, tags: ['preview'] };
```

On a distribution Playwright does not ship a Chromium for (Arch, Manjaro), point
it at the system one:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:stories
```

## Traps

- **Test ids are `data-pw`, not `data-testid`.** `getByTestId('submit')` finds
  `data-pw="submit"`; pass `testIdAttribute: 'data-testid'` to keep yours.
- **The default browsers include the `chrome` and `msedge` channels**, which
  `bunx playwright install` does not download: `bunx playwright install chrome msedge`,
  or `browsers: ['chromium']`.
- **The default web server runs `bun dev -m test --port <port>`.** An app whose
  `dev` script does not take those flags passes `webServer` (or `false`).
- **A `webServer` in `overrides` adds a second server**, it does not replace
  the first: set it with the `webServer` option.
- **`auth.setup.ts` belongs in `playwright/config/`** — the `setup` project
  looks only there — and `playwright/.auth/` holds live session cookies:
  add it to `.gitignore`.
- **`test.use({ handlers })` replaces the default handlers**; to add one, use
  `network.use(...)` or spread the defaults after it.
- **`mobile` adds projects, it does not filter `browsers`**: `browsers: ['firefox'], mobile: true`
  runs Firefox *and* a Chromium phone. Firefox has no phone emulation (no
  `isMobile`); see [docs/guide/config.md](docs/guide/config.md#mobile).
- **A page without `<meta name="viewport" content="width=device-width">` never
  scrolls sideways on a phone**: it is laid out 980px wide and zoomed out, so
  `expectNoHorizontalScroll` passes. Add the tag.
- **`expectAccessible` scans the page as it is now**: wait for the content
  (and for transitions to end) first, or `color-contrast` reports colours
  mid-fade.
- **`withHydration` waits for a marker the app sets**: without
  `<html data-hydrated>` (or another marker), every `goto` fails with
  "was not hydrated after 15000ms".
- **A run with `SCREENS=1` empties the screens folder**, which is
  `playwright/screenshots`, `BasePage.screenshot()`'s folder too: give one a
  `dir` of its own. An `overrides.globalSetup` replaces the emptying.
- **`settled` does not wait for web fonts**, which change widths:
  `await page.evaluate(() => document.fonts.ready)` first.
- **Never import `/storybook/capture` or `/storybook/setup` from Node** — they
  touch `document`. `storybookProject()` already registers the setup file.
- **Only one story per component should carry `preview`**: they share one file
  name, so the last one captured wins.

## Documentation

- [Guide](docs/README.md) — every option, default and the realistic setup, per area; [hydration](docs/guide/hydration.md), [screens](docs/guide/screens.md), [PWA](docs/guide/pwa.md), [accessibility](docs/guide/a11y.md).
- [Troubleshooting](docs/troubleshooting.md) — the error you are looking at, and its fix.
- [Roadmap](docs/roadmap.md) — what is coming, and what is not planned.

# @nxgt/playwright

The Playwright boilerplate every app ends up writing, written once: a shared
`playwright.config.ts`, `BasePage` and `FormPage` page objects, sign-in and
storage-state fixtures, msw network fixtures, a driver for the mocks of an
SSR app's server, links read from a local Mailpit, navigation and fills that wait
for hydration, waits for a page at rest, axe accessibility checks, phone
projects and a no-sideways-scroll check, full-page screens of every state,
PWA specs against a production build (offline, a new worker version, what the
caches keep), and Storybook stories run as Vitest browser tests that can also capture WebP
previews of your components.

## Install

```bash
bun add -d @nxgt/playwright @playwright/test
```

Every peer is optional except `typescript` (`^6.0.3 || ^7.0.0`); install the ones for the
subpaths you import:

| Subpath | Peers to add |
| --- | --- |
| `.`, `/config`, `/pages`, `/auth`, `/helpers`, `/pwa`, `/react-router` | `@playwright/test` (`^1.61.0`); the root re-exports `/screens`, so `checkScreen` imported from it needs `@axe-core/playwright` when the scan runs (the default, or an options object) |
| `/a11y` | `@playwright/test`, `@axe-core/playwright` (`>=4.10.0 <5`) |
| `/screens` | `@playwright/test`, plus `@axe-core/playwright` when the scan runs (the default, or an options object) |
| `/csp` | `@playwright/test` |
| `/msw` | `@playwright/test`, `msw` (`^2.12.10 \|\| ^3.0.0`), `@msw/playwright` (`>=0.6.7 <0.8`; 0.7 needs msw 3) |
| `/mock-server` | `@playwright/test` only (it talks HTTP) |
| `/mailpit` | nothing (`fetch` only) |
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
| `@nxgt/playwright` | everything from `/config`, `/pages`, `/auth`, `/helpers`, `/screens`, `/pwa`, `warmUp` | Node |
| `@nxgt/playwright/config` | `defineAppConfig`, `selectedProjects`, `projectsFromArgv`, `PROJECTS_ENV`; types `AppConfigOptions`, `WarmUpOption`, `Browser`, `DeviceName`, `MobileProject` | Node |
| `@nxgt/playwright/pages` | `BasePage`, `FormPage`, `DEFAULT_SCREENSHOT_DIR`, option types | Node |
| `@nxgt/playwright/auth` | `authSetup`, `authFile`, `withLoginFixture`, `DEFAULT_AUTH_DIR` | Node |
| `@nxgt/playwright/helpers` | `withHydration`, `hydrated`, `hydrationWarnings`, `DEFAULT_HYDRATION_MARKER`, `settled`, `nextFrames`, `toastsGone`, `isMobileProject`, `fillSettled`, `fillUntilEnabled`, `expectNoHorizontalScroll`, `formatOverflow`, `expectNoTextOverflow`, `formatTextOverflow`, `expectTapTargets`, `formatTapTargets`, `DEFAULT_TAP_TARGETS`, `screenshotName` | Node |
| `@nxgt/playwright/tap-targets` | `tapTargetVerdict`; types `TapTargetVerdict`, `TapTargetVerdictKind`, `TapTargetVerdictOptions` | Browser (and Node to import) |
| `@nxgt/playwright/screens` | `checkScreen`, `saveScreen`, `savingScreens`, `DEFAULT_SCREENS_DIR`, `CheckScreenOptions` | Node |
| `@nxgt/playwright/pwa` | `pwaProject`, `isPwaRun`, `serviceWorkerControlled`, `goOffline`, `goOnline`, `nextWorkerVersion`, `appendVersionComment`, `cachedUrls`, `expectNotCached`, `fillCaches`, `expectOnlyCaches`, `cacheProblems`, `filledCacheUrl`; types `PwaProjectOptions`, `GoOfflineOptions`, `NextWorkerVersionOptions`, `CacheMatcher` | Node |
| `@nxgt/playwright/react-router` | `reactRouterHydrated`, `elementHydrated` | Node |
| `@nxgt/playwright/a11y` | `expectAccessible`, `accessibilityScan`, `withA11y`, `expectFocusAboveActions`, `expectFieldsAboveActions`, `formatViolations`, `withOverlaysInFlow`, `DEFAULT_TAGS`, `DEFAULT_UNSTICK`; types `A11yOptions`, `FocusOptions`, `FocusFieldsOptions`, `DisabledRule`, `AccessibilityResults` | Node |
| `@nxgt/playwright/csp` | `watchCsp`, `withCspGuard`, `cspTest`, `expectNoncedPage`, `cspNonce`, `loadPolicy`; types `CspGuardFixtures`, `ExpectNoncedPageOptions`, `LoadedPolicy` | Node |
| `@nxgt/playwright/msw` | `createMswTest`, `MswFixtures`, `MswTestOptions` | Node |
| `@nxgt/playwright/mock-server` | `createMockServerTest`, `MockServer`, `ServerOverride`, `MockServerFixtures`, `MockServerTestOptions` | Node |
| `@nxgt/playwright/mailpit` | `mailpit`, `Mailpit`, `MailpitMessage`, `MailpitOptions`, `WaitForLinkOptions` | Node |
| `@nxgt/playwright/storybook` | `storybookProject`, `componentId`, `titleToComponentId`; types `StorybookProjectOptions`, `StorybookBrowser`, `PreviewCaptureOptions`, `StoryPreviewParameters` | Node (Vitest config) |
| `@nxgt/playwright/storybook/capture` | `capturePreview` | **browser only** |
| `@nxgt/playwright/storybook/setup` | an `afterEach(capturePreview)` side effect | **browser only** |

The root barrel does not re-export `/a11y`, `/csp`, `/msw`, `/mock-server`, `/mailpit` or `/storybook`, so an app
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

For that PWA run, `pwaProject` and `isPwaRun` (from `/pwa`) write these
options for you: see [PWA](#pwa).

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

A cold Vite dev server answers 504 "Outdated Optimize Dep" to the first page
while it optimizes, and that page never hydrates. `warmUp` opens a page once
before the specs and reloads it until it hydrates (`reloadEvery` 15 s,
`timeout` 3 min, then it fails naming the URL); `warmUp()` is the same for a
`globalSetup` of your own:

```ts
import { reactRouterHydrated } from '@nxgt/playwright/react-router';

export default defineAppConfig({
	port: 5174,
	warmUp: { path: '/sign-in', marker: reactRouterHydrated },
});
```

### A page at rest

`settled(page)` resolves once the active view transition has finished and every
animation and transition that ends has ended (a spinner is left running); `nextFrames(page, count = 2)` once a render is
committed and the effects it scheduled have run. Call them before an axe scan, which reads
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

A label that runs past its button, or a title cut short by an ellipsis with
nothing to read it in full, is a phone bug no scroll check sees.
`expectNoTextOverflow` fails on them (text that wraps, a box that scrolls and
a clipped text with a `title` or an `aria-label` pass); `checkScreen` runs it
with `textOverflow: true`:

```ts
import { expectNoTextOverflow } from '@nxgt/playwright/helpers';

test('labels fit a phone', async ({ page }) => {
	await page.goto('/projects');
	await expectNoTextOverflow(page, { exclude: '.marquee' });
});
```

An icon button a mouse hits and a thumb misses is the third.
`expectTapTargets` fails on a link, button or control smaller than 44x44 CSS
pixels, unless its invisible hit area (a 44px `::before`) fills that square
(`hitArea: false` turns the probe off). A 24px minimum is axe's `target-size`,
which `expectAccessible` already runs; `checkScreen` takes
`tapTargets: (info) => isMobileProject(info)` for phones only:

```ts
import { expectTapTargets } from '@nxgt/playwright/helpers';

test('tap targets fit a thumb', async ({ page }) => {
	await page.goto('/projects');
	await expectTapTargets(page, { exclude: '.legal a' });
});
```

The same verdict runs in the browser for one element, where Playwright is not
there, such as a Storybook play or a Vitest browser test:

```ts
import { tapTargetVerdict } from '@nxgt/playwright/tap-targets';

export const SelectAll = {
	play: async ({ canvas }) => {
		const { ok, verdict, width, height } = await tapTargetVerdict(
			await canvas.findByRole('checkbox', { name: 'Select all' }),
		);
		if (!ok) throw new Error(`${verdict}: ${width}x${height}px`);
	},
};
```

**Trap:** a page without `<meta name="viewport" content="width=device-width,
initial-scale=1">` is laid out 980px wide on a phone and zoomed out, so
`expectNoHorizontalScroll` always passes and tap targets are measured at a
size nobody sees. Add the tag to the app's document first.

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
import { checkScreen } from '@nxgt/playwright/screens';

test('projects', async ({ page }, testInfo) => {
	await page.goto('/projects');
	// Fonts and motion settled, screen saved when SCREENS=1, then the axe scan
	// and the no-sideways-scroll check. Options: `a11y`, `scroller`, `textOverflow`, `tapTargets`, …
	await checkScreen(page, testInfo, 'projects');
});
```

```bash
SCREENS=1 bunx playwright test   # playwright/screenshots/chromium/projects.png, …/mobile-chromium/…
```

See [docs/guide/screens.md](docs/guide/screens.md).

### PWA

A service worker registers in a production build only, so its specs run as a
project of their own against `build && start` on another port, with no mocks;
every other project keeps the dev server:

```ts
// playwright.config.ts
import { defineAppConfig } from '@nxgt/playwright/config';
import { isPwaRun, pwaProject } from '@nxgt/playwright/pwa';

// `--project=pwa` (or PWA=1): bun run build && bun run start, PORT=5274, ./playwright/pwa in Chromium.
export default defineAppConfig(
	isPwaRun() ? pwaProject({ port: 5274 }) : { port: 5273, setup: true, mobile: true },
);
```

```ts
// playwright/pwa/worker.spec.ts
import { expect, test } from '@playwright/test';
import {
	cachedUrls,
	expectNotCached,
	goOffline,
	goOnline,
	nextWorkerVersion,
	serviceWorkerControlled,
} from '@nxgt/playwright/pwa';

test('offline, a load shows the offline page', async ({ page }) => {
	await page.goto('/');
	await goOffline(page); // once the worker controls the page
	await page.goto('/projects');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('You are offline');
	await goOnline(page);
});

test('a new version is offered', async ({ page }) => {
	await page.goto('/');
	await serviceWorkerControlled(page);
	// Edits the script on disk, asks for an update, restores it; resolves once the new worker installed.
	await nextWorkerVersion(page, { file: 'build/client/service-worker.js' });
	await expect(page.getByRole('status')).toContainText('New version available');
});

test('keeps no signed-in page', async ({ page }) => {
	await page.goto('/');
	await serviceWorkerControlled(page);
	expect(await cachedUrls(page)).toHaveProperty('precache-v1');
	await expectNotCached(page, /^\/account/);
});
```

What a sign-out leaves needs no worker: `fillCaches` makes the caches, even
under the dev server, and `expectOnlyCaches` fails on any cache but those it
keeps (an exact name must be there; a pattern or a predicate may be):

```ts
import { expectOnlyCaches, fillCaches } from '@nxgt/playwright/pwa';

await fillCaches(page, ['app-precache-v2', 'app-pages-v2']);
await page.getByRole('button', { name: 'Sign out' }).click();
await expectOnlyCaches(page, 'app-precache-v2');
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

Sticky form actions (`DEFAULT_UNSTICK`) are put back in the flow while axe
runs, so `target-size` does not depend on where the page stopped scrolling.
Add your own sticky bars (a sticky header included), or turn it off with
`unstick: []`:

```ts
import { DEFAULT_UNSTICK, expectAccessible } from '@nxgt/playwright/a11y';

await expectAccessible(page, {
	unstick: [...DEFAULT_UNSTICK, '.app-header', '.app-bottom-bar'],
});
```

axe does not check WCAG 2.4.11 (Focus Not Obscured), so a control hidden under
that sticky bar is yours to check: `expectFocusAboveActions` for the focused
control, `expectFieldsAboveActions` to tab from it up to the submit:

```ts
import { expectFieldsAboveActions } from '@nxgt/playwright/a11y';

await page.getByLabel('Name').focus();
await expectFieldsAboveActions(page); // or { actions: '.app-bottom-bar', until: page.getByRole('button', { name: 'Save' }) }
```

### Content-Security-Policy

```ts
import { cspTest as test, expectNoncedPage } from '@nxgt/playwright/csp';

// Fails any test whose pages met a Content-Security-Policy refusal.
test('home', async ({ page }) => {
	await page.goto('/');
});

test('the home page is nonced', async ({ request }) => {
	await expectNoncedPage(request, '/', {
		scriptSrc: "'self' 'nonce-{nonce}' 'strict-dynamic'",
	});
});
```

`withCspGuard(test)` adds the guard to your own `test`; `watchCsp(context)`
returns the refusals collected so far. See [docs/guide/csp.md](docs/guide/csp.md).

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

### Mock server

When the app's **server** calls the API (SSR, a BFF), the browser's msw never
sees it. The mocks then live in the server, which mounts a control route
(`@nxgt/msw-graphql`'s `createMockControl`, at `/__mocks` by default), and
the spec drives it over HTTP:

```ts
// playwright/config/playwright.setup.ts
import { test as base } from '@playwright/test';
import { createMockServerTest } from '@nxgt/playwright/mock-server';

export const test = createMockServerTest(base); // or createMockServerTest(createMswTest(handlers))
export { expect } from '@playwright/test';
```

```ts
// playwright/e2e/students.spec.ts
import { expect, test } from '../config/playwright.setup';

test('API down', async ({ page, mockServer }) => {
	await mockServer.fail(503);
	await page.goto('/students');
	await expect(page.getByRole('alert')).toBeVisible();
});

test.describe('forbidden', () => {
	test.use({
		serverMocks: [{ operationName: 'GetStudents', status: 403, errors: [{ message: 'forbidden' }] }],
	});
	// or, in a test: await mockServer.scenario('remove', { id: 7 });
});
```

The mocks are reset before and after every test. They are process-global:
run these specs with `workers: 1`, or scope them per worker with
`createMockServerTest(base, { scope: true })`: the control calls, the `page` and
the `request` then carry `x-mock-scope: <workerIndex>`, and an app whose control
keeps a state per scope (`@nxgt/msw-graphql`'s `control.scope`, `withScope`)
runs with `workers > 1`. See [docs/guide/mock-server.md](docs/guide/mock-server.md#parallel-workers-the-scope-option).

### Mail links (Mailpit)

For mail flows (address verification, password reset, sign-in links) tested
against a local [Mailpit](https://mailpit.axllent.org) SMTP sink. It needs no
peer: it only calls Mailpit's HTTP API with `fetch`.

```ts
import { mailpit } from '@nxgt/playwright/mailpit';

const mail = mailpit(); // E2E_MAILPIT_URL, else http://localhost:8025

test('confirms the address', async ({ page }) => {
	await mail.clear();
	await signUp(page, 'new@example.test');
	const link = await mail.waitForLink({ to: 'new@example.test', match: /\/confirm\?/ });
	await page.goto(link);
});
```

`waitForLink` returns the first link `match` accepts, newest message first, for that
address, absolute and with `&amp;` decoded, and throws a message naming the
address and the pattern on timeout. See [docs/guide/mailpit.md](docs/guide/mailpit.md).

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
			// storybookProject({ browsers: ['chromium', 'firefox'] }), // …and in Firefox
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
- **Server mocks are global to the app's server** unless `scope: true`: specs
  using `mockServer` or `serverMocks` run with `workers: 1`
  (`overrides: { workers: 1, fullyParallel: false }`) or with a scoped fixture.
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
- **`nextWorkerVersion` edits the worker's file on disk**: the server must
  read it per request, and no two specs may run it at once — give the PWA run
  `overrides: { workers: 1 }`.
- **`goOffline` takes the whole context offline**, every page of it, until
  `goOnline`. That it reaches a worker's own fetches is verified in Chromium,
  where `pwaProject` runs. It needs `@playwright/test` 1.61 or newer
  ([troubleshooting](./docs/troubleshooting.md#offline-a-fetch-from-the-page-still-answers-200-on-an-older-playwright)).
- **`settled` does not wait for web fonts**, which change widths:
  `await page.evaluate(() => document.fonts.ready)` first.
- **Never import `/storybook/capture` or `/storybook/setup` from Node** — they
  touch `document`. `storybookProject()` already registers the setup file.
- **Only one story per component should carry `preview`**: they share one file
  name, so the last one captured wins.
- **`capture` takes a single browser**: every browser writes the same preview
  file, so `storybookProject({ capture: true, browsers: [...two or more] })`
  throws. Run the cross-browser smoke test as a second project without `capture`.
- **`capture` cannot use `webkit`**: WebKit cannot encode WebP, so
  `storybookProject({ capture: true, browsers: ['webkit'] })` throws. Capture in
  `chromium` or `firefox`
  ([troubleshooting](docs/troubleshooting.md#storybookproject-capture-cannot-use-webkit-browsers-is-list-webkit-cannot-encode-webp-previews-capture-with-chromium-or-firefox)).

## Documentation

- [Guide](docs/README.md) — every option, default and the realistic setup, per area; [hydration](docs/guide/hydration.md), [screens](docs/guide/screens.md), [PWA](docs/guide/pwa.md), [accessibility](docs/guide/a11y.md), [Content-Security-Policy](docs/guide/csp.md), [mock server](docs/guide/mock-server.md), [mail links](docs/guide/mailpit.md).
- [Troubleshooting](docs/troubleshooting.md) — the error you are looking at, and its fix.
- [Roadmap](docs/roadmap.md) — what is coming, and what is not planned.

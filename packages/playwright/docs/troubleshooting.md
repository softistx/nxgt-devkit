# Troubleshooting

Each heading is the text you will see in the terminal or the test report,
without the stack or your local paths. Most entries are errors from one of
the package's peers (Playwright, Vitest, Vite, Storybook, axe) that its
defaults, or its setup, make you likely to hit; the few `@nxgt/playwright`
throws itself are quoted exactly.

- [Install](#install)
  - [`Cannot find package '@msw/playwright'`](#cannot-find-package-mswplaywright)
  - [`Cannot find package 'msw'`](#cannot-find-package-msw)
  - [`Running mixed versions is not supported and may lead into bugs`](#running-mixed-versions-is-not-supported-and-may-lead-into-bugs)
  - [`@nxgt/playwright/a11y needs @axe-core/playwright, an optional peer that is not installed`](#nxgtplaywrighta11y-needs-axe-coreplaywright-an-optional-peer-that-is-not-installed)
- [Browsers](#browsers)
  - [`Executable doesn't exist at …/chromium_headless_shell-<revision>/…`](#executable-doesnt-exist-at-chromium_headless_shell-revision)
  - [`BEWARE: your OS is not officially supported by Playwright`](#beware-your-os-is-not-officially-supported-by-playwright)
  - [`Chromium distribution 'msedge' is not found`](#chromium-distribution-msedge-is-not-found)
- [Import](#import)
  - [`vitest/browser can be imported only inside the Browser Mode`](#vitestbrowser-can-be-imported-only-inside-the-browser-mode)
- [Configuration](#configuration)
  - [`Error: No tests found`](#error-no-tests-found)
  - [`Process from config.webServer was not able to start`](#process-from-configwebserver-was-not-able-to-start)
  - [`… is already used, make sure that nothing is running on the port/url`](#-is-already-used-make-sure-that-nothing-is-running-on-the-porturl)
  - [`Found a setup file with "setProjectAnnotations"`](#found-a-setup-file-with-setprojectannotations)
  - [`waiting for getByTestId('…')` until the test times out](#waiting-for-getbytestid-until-the-test-times-out)
  - [`defineAppConfig: two projects are named "mobile-chromium"`](#defineappconfig-two-projects-are-named-mobile-chromium)
  - [`defineAppConfig: "…" is not one of Playwright's devices`](#defineappconfig--is-not-one-of-playwrights-devices)
  - [A `mobile-firefox` project does not look like a phone](#a-mobile-firefox-project-does-not-look-like-a-phone)
  - [`defineAppConfig: the screens' global setup is missing at <path>`](#defineappconfig-the-screens-global-setup-is-missing-at-path)
  - [Old screens remain, or the screens folder is empty](#old-screens-remain-or-the-screens-folder-is-empty)
  - [A config that branches on `--project` builds something else in the workers](#a-config-that-branches-on---project-builds-something-else-in-the-workers)
- [Hydration](#hydration)
  - [`<url> was not hydrated after <timeout>ms (marker: …)`](#url-was-not-hydrated-after-timeoutms-marker-)
  - [`React never attached its props to this element`](#react-never-attached-its-props-to-this-element)
- [PWA](#pwa)
  - [`No service worker controls <url> after <timeout>ms`](#no-service-worker-controls-url-after-timeoutms)
  - [`<url> is cached: <cache> (<urls>)`](#url-is-cached-cache-urls)
- [Accessibility](#accessibility)
  - [`disableRules: "…" is disabled without a reason`](#disablerules--is-disabled-without-a-reason)
  - [`color-contrast` fails, then passes on a retry](#color-contrast-fails-then-passes-on-a-retry)
  - [`expectNoHorizontalScroll` passes on a phone for a page that is clearly too wide](#expectnohorizontalscroll-passes-on-a-phone-for-a-page-that-is-clearly-too-wide)
  - [`The scroll container <tag#id.class> scrolls horizontally`](#the-scroll-container-tagidclass-scrolls-horizontally)
- [Auth and forms](#auth-and-forms)
  - [`Error reading storage state from playwright/.auth/<account>.json`](#error-reading-storage-state-from-playwrightauthaccountjson)
  - [`page.waitForURL: Test timeout of 30000ms exceeded.`](#pagewaitforurl-test-timeout-of-30000ms-exceeded)
  - [`expect(locator).toHaveValue(expected) failed` right after a fill](#expectlocatortohavevalueexpected-failed-right-after-a-fill)
- [Preview capture](#preview-capture)
  - [`Access denied to "…". See Vite config documentation for "server.fs"`](#access-denied-to--see-vite-config-documentation-for-serverfs)
  - [`Cannot modify file "…". File writing is disabled`](#cannot-modify-file--file-writing-is-disabled)
  - [`EncodingError: The source image cannot be decoded.`](#encodingerror-the-source-image-cannot-be-decoded)

## Install

### `Cannot find package '@msw/playwright'`

The same entry covers `Cannot find package 'msw'`,
`'@storybook/addon-vitest'`, `'@vitest/browser-playwright'`, `'vitest'` and
`'@playwright/test'`.

**When:** importing a subpath, or loading a config that imports it.
**Why:** every peer is optional, and each subpath needs only its own. The one
you import needs a peer you have not installed.
**Fix:** install the peers of the subpath you use.

| Subpath | Install |
| --- | --- |
| `.`, `./config`, `./pages`, `./auth`, `./helpers`, `./screens`, `./pwa`, `./react-router` | `@playwright/test` |
| `./a11y` | `@playwright/test`, `@axe-core/playwright` |
| `./msw` | `@playwright/test`, `msw`, `@msw/playwright` |
| `./storybook`, `./storybook/capture`, `./storybook/setup` | `vitest`, `@vitest/browser-playwright`, `@storybook/addon-vitest` |

```sh
bun add -d @playwright/test msw @msw/playwright
```

### `Cannot find package 'msw'`

The message continues `imported from …/node_modules/@msw/playwright/…`.

**When:** importing `@nxgt/playwright/msw`, with `msw` 2 installed.
**Why:** `@msw/playwright` 0.7.x requires msw 3. Installed beside msw 2, it
cannot load msw at all. `@nxgt/playwright` supports `@msw/playwright`
`>=0.6.7 <0.7`, the versions that work with msw 2.
**Fix:** keep `@msw/playwright` within that range.

```sh
bun add -d @msw/playwright@~0.6.7
```

### `Running mixed versions is not supported and may lead into bugs`

Printed after `Loaded vitest@<a> and @vitest/browser@<b>.`

**When:** starting a `storybookProject` (Vitest browser mode).
**Why:** `@vitest/browser-playwright` brings `@vitest/browser` at its own
version. When that differs from `vitest`'s, the browser runner and the test
runner disagree about their protocol.
**Fix:** pin both to the same exact version, and upgrade them together.

```sh
bun add -d --exact vitest@4.1.10 @vitest/browser-playwright@4.1.10
```

### `@nxgt/playwright/a11y needs @axe-core/playwright, an optional peer that is not installed`

The message ends `Install it: bun add -d @axe-core/playwright`.

**When:** the first `expectAccessible`, `accessibilityScan` or `a11y.expect()`
of a run.
**Why:** `@nxgt/playwright/a11y` loads axe only when a scan runs, and
`@axe-core/playwright` is an optional peer: installing `@nxgt/playwright`
does not bring it.
**Fix:**

```sh
bun add -d @axe-core/playwright
```

## Browsers

### `Executable doesn't exist at …/chromium_headless_shell-<revision>/…`

Or the same with `firefox-<revision>`.

**When:** the first test, when Playwright launches the browser.
**Why:** each Playwright version expects one browser build (the revision in
the path). A fresh install, or an upgrade of `@playwright/test` or
`playwright`, needs that build downloaded. Headless Chromium runs the
separate `chromium-headless-shell` build, which both `defineAppConfig` and
`storybookProject` use.
**Fix:** install the browsers with the Playwright the project resolves, so the
revision matches.

```sh
bunx playwright --version          # the version the project resolves
bunx playwright install chromium-headless-shell
bunx playwright install firefox    # defineAppConfig's default browsers include it
```

If `@playwright/test` and the `playwright` that `@vitest/browser-playwright`
uses resolve to different versions, each wants its own revision: keep them on
the same version.

### `BEWARE: your OS is not officially supported by Playwright`

Followed by `downloading fallback build for ubuntu24.04-x64.` (or
`installing dependencies for … as a fallback.`)

**When:** `playwright install` on a Linux that Playwright does not support
(Arch, Manjaro, and others).
**Why:** Playwright only builds browsers for a few distributions, so it
downloads the Ubuntu build instead. That build usually runs.
**Fix:** carry on. Do not run `install --with-deps` or `install-deps` there:
they install Ubuntu system packages. If the fallback will not launch, point
the Storybook project at the system Chromium:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bunx vitest --project storybook
```

`storybookProject` reads that variable (or its `executablePath` option).
`defineAppConfig` does not, so pass it through `overrides`:

```ts
import { defineAppConfig } from '@nxgt/playwright/config';

export default defineAppConfig({
	port: 5174,
	browsers: ['chromium'],
	overrides: {
		use: {
			launchOptions: {
				executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
			},
		},
	},
});
```

### `Chromium distribution 'msedge' is not found`

Or `'chrome'`, followed by `Run "npx playwright install msedge"`.

**When:** the first test of the `msedge` or `chrome` project.
**Why:** `defineAppConfig`'s default browsers are
`['chromium', 'firefox', 'msedge', 'chrome']`. The last two are the branded
browsers installed on the machine, which Playwright does not download into
its cache.
**Fix:** install them, or list only the browsers you run:

```ts
export default defineAppConfig({ port: 5174, browsers: ['chromium', 'firefox'] });
```

## Import

### `vitest/browser can be imported only inside the Browser Mode`

Followed by `Instead, it was imported outside of Vitest.`, or by
`Your test is running in <pool> pool.`

**When:** importing `@nxgt/playwright/storybook/capture` or
`@nxgt/playwright/storybook/setup` from Node, Bun, `bun test`, or a Vitest
project that is not in browser mode.
**Why:** both subpaths import `vitest/browser`, which only exists inside a
Vitest browser run.
**Fix:** configure Vitest from `@nxgt/playwright/storybook`, which runs in
Node, and let `storybookProject` load the setup file in the browser for you.

```ts
// vitest.config.ts
import { storybookProject } from '@nxgt/playwright/storybook';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: { projects: [storybookProject(), storybookProject({ capture: true })] },
});
```

Import `./storybook/capture` only from a setup file or a test that runs in the
browser. If the error names a pool, a unit project's `include` glob is picking
up a browser test: exclude it.

## Configuration

### `Error: No tests found`

**When:** `playwright test`, before any browser starts.
**Why:** `defineAppConfig` looks in `./playwright/e2e`, relative to the
config file, and uses Playwright's default `testMatch` (`*.spec.ts`,
`*.test.ts`). Your specs live elsewhere or are named differently.
**Fix:** say where they are and how they are named.

```ts
export default defineAppConfig({
	port: 5174,
	testDir: './e2e',
	overrides: { testMatch: /\.e2e\.ts$/ },
});
```

### `Process from config.webServer was not able to start`

Followed by `Exit code: <n>`.

**When:** `playwright test`, before any browser starts.
**Why:** the default web server is `bun dev -m test --port <port>`, which
assumes a `dev` script that accepts Vite's `-m` (mode) and `--port`. Your app
starts differently.
**Fix:** give the command that starts your app, or `false` when something else
already started it.

```ts
export default defineAppConfig({
	port: 3000,
	webServer: {
		command: 'bun run start',
		url: 'http://localhost:3000',
		reuseExistingServer: !process.env.CI,
	},
});
```

### `… is already used, make sure that nothing is running on the port/url`

The message continues `or set reuseExistingServer:true in config.webServer.`

**When:** on CI, or with a `webServer` passed through `overrides`.
**Why:** with `CI` set, the default server is not reused, so a server already
on the port is an error. And `overrides.webServer` is **added** to the
default server rather than replacing it, so two servers claim the same port.
**Fix:** pass your server through the `webServer` option, never through
`overrides`. When a CI step starts the stack itself, turn the server off:

```ts
export default defineAppConfig({ port: 5174, webServer: false });
```

### `Found a setup file with "setProjectAnnotations"`

Printed by `@storybook/addon-vitest` in an info box, followed by
`Skipping automatic provisioning of preview annotations to avoid conflicts.`

**When:** starting a `storybookProject` with a setup file in `.storybook/`
that calls `setProjectAnnotations`.
**Why:** since Storybook 10.3 the addon applies `.storybook/preview`'s
annotations itself. A setup file that still does it turns that off, and your
copy has to be kept in step with the preview by hand.
**Fix:** remove the call, and the file if nothing else is in it. Do not pass it
to `storybookProject`'s `setupFiles`.

```ts
// .storybook/vitest.setup.ts: delete these lines
import { setProjectAnnotations } from '@storybook/react-vite';
import * as preview from './preview';
setProjectAnnotations([preview]);
```

### `waiting for getByTestId('…')` until the test times out

The call log of a `locator.click`, `locator.fill` or `expect(locator)` that
ends in `Test timeout of 30000ms exceeded.`

**When:** the first `getByTestId` in a suite whose markup uses
`data-testid`.
**Why:** `defineAppConfig` sets `testIdAttribute` to `data-pw`, so
`getByTestId('submit')` looks for `data-pw="submit"`, and `FormPage` finds its
submit button the same way.
**Fix:** name the attribute your markup uses.

```ts
export default defineAppConfig({ port: 5174, testIdAttribute: 'data-testid' });
```

### `defineAppConfig: two projects are named "mobile-chromium"`

The message continues `Give a mobile device a name of its own`.

**When:** loading `playwright.config.ts`.
**Why:** a mobile project is named after its browser, so two Android devices
(both Chromium) or two iPhones (both WebKit) claim the same name, and
Playwright needs each project name once.
**Fix:** name all but one.

```ts
export default defineAppConfig({
	port: 5174,
	mobile: ['Pixel 7', { device: 'Galaxy S9+', name: 'mobile-small' }],
});
```

### `defineAppConfig: "…" is not one of Playwright's devices`

Or `defineAppConfig: "…" is not a mobile device`.

**When:** loading `playwright.config.ts` written in JavaScript, or with a name
that came from a variable (TypeScript already rejects a literal typo).
**Why:** `mobile` takes names from Playwright's `devices`, spelt as there
(`'iPhone 14'`, not `'iphone-14'`), and only phones and tablets.
**Fix:** use a name from the list, and `browsers` for a desktop browser.

```sh
bun -e "import { devices } from '@playwright/test'; console.log(Object.keys(devices).filter((d) => devices[d].isMobile))"
```

### A `mobile-firefox` project does not look like a phone

No error: the page renders as a narrow desktop page, ignores
`<meta name="viewport">`, and media queries on `pointer: coarse` or the mobile
user agent do not match.

**When:** a Firefox project built with a phone viewport (`mobile` never adds
one: no Playwright device runs on Firefox).
**Why:** Playwright does not support `isMobile` in Firefox. The viewport size
and `hasTouch` are honoured; mobile layout emulation is not.
**Fix:** test the phone layout on `mobile-chromium` (or `mobile-webkit` with an
iPhone), and keep a Firefox phone-sized project only for width and touch
checks. See [guide/config.md](guide/config.md#mobile).

### `defineAppConfig: the screens' global setup is missing at <path>`

The message continues ` Reinstall @nxgt/playwright.` and `<path>` ends in
`screens/clear.js`.

**When:** loading `playwright.config.ts` with `screens` set and `SCREENS=1`.
**Why:** the global setup that empties the screens folder ships in the
package's `dist/`. The installation is incomplete or was patched.
**Fix:** reinstall the package.

```sh
bun add -d @nxgt/playwright
```

### Old screens remain, or the screens folder is empty

No error: a screen you renamed is still in the folder, or nothing was saved.

**When:** after `defineAppConfig({ screens: true })`.
**Why:** the folder is emptied by a global setup, and only on a run whose
variable is `1`. Either the run did not set it (`SCREENS=1`, or the `env` you
named), or `overrides.globalSetup` replaced the package's one.
**Fix:** set the variable, and list both setups when you have your own.

```bash
SCREENS=1 bunx playwright test e2e/screens
```

`overrides.globalSetup` replaces the screens' setup; Playwright accepts an
array, so list your setup beside the package's, or empty the folder in your
own. The default folder is also
where `BasePage.screenshot()` writes: a `SCREENS=1` run empties those files
too. Give the screens another `dir`. See [guide/screens.md](guide/screens.md).

### A config that branches on `--project` builds something else in the workers

No error: a `--project=pwa` run starts the dev server instead of the
production build, or the workers use another port than the runner.

**When:** the config reads `process.argv` to pick a port, a server or the
projects.
**Why:** Playwright's workers load the config again without the command line,
so `process.argv` holds no `--project` there.
**Fix:** read the selection through `selectedProjects`, which hands the
runner's answer to the workers.

```ts
import { defineAppConfig, selectedProjects } from '@nxgt/playwright/config';

const pwa = selectedProjects().includes('pwa');
export default defineAppConfig({ port: pwa ? 5274 : 5273 });
```

See [guide/config.md](guide/config.md#selectedprojects).

## Hydration

### `<url> was not hydrated after <timeout>ms (marker: …)`

The message continues `Look for a client error in the console, a module that
failed to load, or an app that never sets the marker.` The marker reads
`a function` when it is one.

**When:** on every `goto` once `withHydration` wraps the `test`, or on a call
to `hydrated`.
**Why:** the page's hydration marker (`html[data-hydrated]` by default) never
appears. The app does not set it, its client bundle failed to load or threw,
or the page is not a hydrating one.
**Fix:** set the marker in the root component's effect, use the React Router
adapter, or turn the wait off for pages that never hydrate.

```tsx
useEffect(() => {
	document.documentElement.dataset.hydrated = '';
}, []);
```

```ts
import { reactRouterHydrated } from '@nxgt/playwright/react-router';

export const test = withHydration(base, { marker: reactRouterHydrated });
// or, for a block of specs: test.use({ hydration: false });
```

When the marker is right, open the page by hand and read the browser console.
See [guide/hydration.md](guide/hydration.md).

### `React never attached its props to this element`

**When:** `elementHydrated(locator)` on an element React does not manage, or
a page where React did not hydrate.
**Why:** it waits for the `__reactProps…` key React puts on a hydrated
element. A server-rendered node React never took over, or an element outside
the React tree, never gets one.
**Fix:** check the locator points at a React element, and that the page itself
hydrated (`hydrationWarnings` shows a mismatch).

## PWA

### `No service worker controls <url> after <timeout>ms`

The message continues `: is it registered in this build, and does it call
clients.claim()? Playwright's `serviceWorkers` must not be 'block'.`

**When:** `serviceWorkerControlled(page)`.
**Why:** no worker controls the page. The build does not register one (most
frameworks register it in a production build only, not in a dev server), the
worker does not call `clients.claim()`, or the project blocks workers.
**Fix:** run the spec against a production build, in a project that allows
workers, and have the worker claim its clients.

```ts
use: { ...devices['Desktop Chrome'], serviceWorkers: 'allow' }
```

See [guide/pwa.md](guide/pwa.md) and the project that runs alone in
[guide/config.md](guide/config.md#a-project-that-runs-alone).

### `<url> is cached: <cache> (<urls>)`

**When:** `expectNotCached(page, url)`.
**Why:** the service worker stored a response that must not be kept. The
message names each cache and the entries that matched.
**Fix:** make the worker's caching rule skip that URL (a signed-in page, an
API answer). `cachedUrls(page)` lists everything cached, as path and query for
the page's origin. Cache Storage exists in a secure context only:
`http://localhost` is one, `about:blank` is not.

## Accessibility

### `disableRules: "…" is disabled without a reason`

Or `disableRules: {…} names no rule.`, where `{…}` is the entry as JSON.

**When:** `expectAccessible` or `accessibilityScan`, before axe runs.
**Why:** each disabled rule must say why it is off, so the exception can be
reviewed and removed one day. TypeScript rejects a bare id; this catches a
JavaScript caller and a blank reason.
**Fix:**

```ts
await expectAccessible(page, {
	disableRules: [{ rule: 'color-contrast', reason: 'brand palette under review, #42' }],
});
```

### `color-contrast` fails, then passes on a retry

The violation names an element that is fading in, sliding, or changing
colour on hover or focus.

**When:** a scan run right after a navigation, a click that opens something,
or while a skeleton is replaced by content.
**Why:** axe computes contrast from the colours at the moment it runs. Half way
through a transition, text and background are a blend that is never seen at
rest.
**Fix:** wait for the final state before scanning; turn motion off if the app
honours `prefers-reduced-motion`. Disable the rule only for a real, accepted
exception — with a reason.

```ts
test.use({ reducedMotion: 'reduce' });

test('dialog is accessible', async ({ page }) => {
	await page.goto('/projects');
	await page.getByTestId('new-project').click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1');
	await expectAccessible(page, { include: '[role=dialog]' });
});
```

### `expectNoHorizontalScroll` passes on a phone for a page that is clearly too wide

**When:** on a `mobile-chromium` or `mobile-webkit` project.
**Why:** without `<meta name="viewport" content="width=device-width">`, a
phone lays the page out 980px wide and zooms out to fit it on screen. Nothing
scrolls sideways, so there is nothing to report — the reader gets a tiny page
instead.
**Fix:** add the tag to the app's document head.

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

### `The scroll container <tag#id.class> scrolls horizontally`

The message continues `scrolls horizontally: scrollWidth Npx > clientWidth
Npx.` and lists the widest elements past the right edge.

**When:** `expectNoHorizontalScroll(page, { scroller })` on a page whose app
shell scrolls its `main` inside.
**Why:** the container is wider than it shows. The document's own check cannot
see it: an inner scroller never widens the document.
**Fix:** narrow the listed elements, or wrap a wide table in its own
`overflow-x: auto` box. A selector that matches nothing (an error page without
the shell) checks the document only.

## Auth and forms

### `Error reading storage state from playwright/.auth/<account>.json`

Followed by `ENOENT: no such file or directory`.

**When:** the first spec that does `test.use({ storageState: authFile('user') })`.
**Why:** the setup project that writes the file did not run, or ran nothing.
`defineAppConfig` adds it only with `setup`, and it matches
`/auth\.setup\.ts$/` in `./playwright/config`. Any other name or folder
matches no file. The pattern is deliberately narrower than `.setup.ts`: a
`playwright.setup.ts` in the same folder (where the msw `test` usually lives)
must not run as a setup project.
**Fix:** turn the setup project on, and put `authSetup` in
`playwright/config/auth.setup.ts`, or say where it is.

```ts
// playwright.config.ts
export default defineAppConfig({ port: 5174, setup: true });
// or: setup: { testDir: './e2e/setup', testMatch: /auth\.setup\.ts$/ }
```

```ts
// playwright/config/auth.setup.ts
import { authSetup } from '@nxgt/playwright/auth';
import { test } from '@playwright/test';

authSetup(test, {
	accounts: { user: USER },
	signIn: async (page, account) => {
		const signIn = new SignInPage(page);
		await signIn.goto(); // the page is blank when signIn is called
		await signIn.signIn(account);
	},
});
```

Add `playwright/.auth/` to `.gitignore`: the files hold live session cookies.

### `page.waitForURL: Test timeout of 30000ms exceeded.`

The call log reads `waiting for navigation to "/" until "load"`.

**When:** in the setup test `Authenticate as <account>`.
**Why:** after `signIn`, `authSetup` waits for the URL in `afterSignIn`
(default `'/'`) before it saves the storage state. A state saved before the
redirect has landed can miss the session cookie. Your app lands somewhere
else after sign-in.
**Fix:** wait for where it does land.

```ts
authSetup(test, {
	accounts: { user: USER },
	signIn: async (page, account) => {
		const signIn = new SignInPage(page);
		await signIn.goto(); // the page is blank when signIn is called
		await signIn.signIn(account);
	},
	afterSignIn: /\/dashboard$/,
});
```

Use `afterSignIn: false` only when `signIn` itself waits for the session to
exist.

### `expect(locator).toHaveValue(expected) failed` right after a fill

Or `expect(locator).toBeEnabled() failed` on a submit button, or a form that
submits empty.

**When:** filling a server-rendered form just after `goto()`. It passes on a
retry, or when run on its own.
**Why:** the input can be filled before the framework hydrates. When hydration
runs, it resets a controlled input to its initial value and the fill is lost
without an error. A submit button that is enabled once proves nothing: it is
enabled after the first fill and disabled again by the reset.
**Fix:** use a fill that checks the value survives.

```ts
import { fillSettled, fillUntilEnabled } from '@nxgt/playwright/helpers';

await fillSettled(page.getByTestId('email'), 'ada@example.com');

await fillUntilEnabled(
	[
		[page.getByTestId('email'), 'ada@example.com'],
		[page.getByTestId('password'), 'secret'],
	],
	page.getByTestId('submit'),
);
```

Both retry until the values (and the button) still hold `settle` ms (default
300) after the fill. Raise `settle` on a slow hydration.

## Preview capture

### `Access denied to "…". See Vite config documentation for "server.fs"`

The quoted path ends in `<dir>/<component id>.webp`.

**When:** the `previews` project, in the `afterEach` that writes a capture.
**Why:** the capture `dir` is resolved against the Vitest project root, and
Vite only lets the browser write inside `server.fs.allow` (the workspace root
by default). A `dir` that climbs out with `../` lands outside it.
**Fix:** keep `dir` inside the project, and copy the previews elsewhere as a
build step if they are needed there.

```ts
storybookProject({ capture: { dir: 'docs/previews' } });
```

If they must be written outside, allow that folder explicitly:

```ts
// vitest.config.ts
export default defineConfig({
	server: { fs: { allow: ['..'] } },
	test: { projects: [storybookProject({ capture: { dir: '../site/previews' } })] },
});
```

### `Cannot modify file "…". File writing is disabled`

The message continues `because the server is exposed to the internet`.

**When:** the `previews` project, when it writes a capture.
**Why:** Vitest turns off file writes from the browser when its API is bound to
a non-local host (`api.host` or `browser.api.host`, as in a container or
remote session).
**Fix:** run the capture project on localhost. If the host must be exposed,
opt back in to writes with `api.allowWrite: true` and `browser.api.allowWrite: true`,
and only on a network you trust.

### `EncodingError: The source image cannot be decoded.`

**When:** in a custom capture of your own (an `afterEach` or a test) that
turns `page.screenshot()` from `vitest/browser` into an image. The built-in
`capturePreview` does not do this.
**Why:** by default `page.screenshot()` saves a file and resolves to its
**path**. With `base64: true` it resolves to `{ path, base64 }`. Neither is
image data, so `image.decode()` on a `data:` URL built from it fails.
**Fix:** ask for the data, not the file.

```ts
import { page } from 'vitest/browser';

const png = await page.screenshot({ element: document.body, save: false });
const image = new Image();
image.src = `data:image/png;base64,${png}`;
await image.decode();
```

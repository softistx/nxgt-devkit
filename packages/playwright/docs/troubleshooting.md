# Troubleshooting

Each heading is the text you will see in the terminal or the test report,
without the stack or your local paths. `@nxgt/playwright` throws nothing of
its own: every entry is an error from one of its peers (Playwright, Vitest,
Vite, Storybook) that this package's defaults, or its setup, make you likely
to hit.

- [Install](#install)
  - [`Cannot find package '@msw/playwright'`](#cannot-find-package-mswplaywright)
  - [`Running mixed versions is not supported and may lead into bugs`](#running-mixed-versions-is-not-supported-and-may-lead-into-bugs)
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
| `.`, `./config`, `./pages`, `./auth`, `./helpers` | `@playwright/test` |
| `./msw` | `@playwright/test`, `msw`, `@msw/playwright` |
| `./storybook`, `./storybook/capture`, `./storybook/setup` | `vitest`, `@vitest/browser-playwright`, `@storybook/addon-vitest` |

```sh
bun add -d @playwright/test msw @msw/playwright
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

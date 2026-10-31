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
  - [`` storybookProject: `executablePath` is a Chromium binary but `browsers` is [<list>]. Add 'chromium' or drop `executablePath`. ``](#storybookproject-executablepath-is-a-chromium-binary-but-browsers-is-list-add-chromium-or-drop-executablepath)
  - [`` storybookProject: `browsers` is empty. Name at least one of chromium, firefox, webkit. ``](#storybookproject-browsers-is-empty-name-at-least-one-of-chromium-firefox-webkit)
  - [`` storybookProject: `capture` needs a single browser but `browsers` is [<list>]. Every browser writes the same preview file; name one. ``](#storybookproject-capture-needs-a-single-browser-but-browsers-is-list-every-browser-writes-the-same-preview-file-name-one)
  - [`` storybookProject: `capture` cannot use 'webkit' (`browsers` is [<list>]): WebKit cannot encode WebP previews. Capture with chromium or firefox. ``](#storybookproject-capture-cannot-use-webkit-browsers-is-list-webkit-cannot-encode-webp-previews-capture-with-chromium-or-firefox)
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
  - [`defineAppConfig: screens.dir resolves to <dir>, which holds <folder>`](#defineappconfig-screensdir-resolves-to-dir-which-holds-folder)
  - [Old screens remain, or the screens folder is empty](#old-screens-remain-or-the-screens-folder-is-empty)
  - [A config that branches on `--project` builds something else in the workers](#a-config-that-branches-on---project-builds-something-else-in-the-workers)
- [Hydration](#hydration)
  - [`<url> was not hydrated after <timeout>ms (marker: …)`](#url-was-not-hydrated-after-timeoutms-marker-)
  - [`warm-up: <url> did not hydrate within <timeout>ms (…)`](#warm-up-url-did-not-hydrate-within-timeoutms-)
  - [`React never attached its props to this element`](#react-never-attached-its-props-to-this-element)
- [PWA](#pwa)
  - [`No service worker controls <url> after <timeout>ms`](#no-service-worker-controls-url-after-timeoutms)
  - [`<url> is cached: <cache> (<urls>)`](#url-is-cached-cache-urls)
  - [`cachedUrls: <url> has no Cache Storage`](#cachedurls-url-has-no-cache-storage)
  - [`Unexpected Cache Storage (caches left: …; caches missing: …)`](#unexpected-cache-storage-caches-left--caches-missing-)
  - [Offline, the page shows the browser's error page, not the app's](#offline-the-page-shows-the-browsers-error-page-not-the-apps)
  - [Offline, a fetch from the page still answers 200 on an older Playwright](#offline-a-fetch-from-the-page-still-answers-200-on-an-older-playwright)
  - [`nextWorkerVersion: no service worker is registered for <url>`](#nextworkerversion-no-service-worker-is-registered-for-url)
  - [`nextWorkerVersion: the browser found no new worker after editing <path>`](#nextworkerversion-the-browser-found-no-new-worker-after-editing-path)
  - [`nextWorkerVersion: the new worker failed to install (redundant)`](#nextworkerversion-the-new-worker-failed-to-install-redundant)
  - [`Timed out waiting 180000ms from config.webServer` on the PWA run](#timed-out-waiting-180000ms-from-configwebserver-on-the-pwa-run)
  - [`--project=pwa` starts the dev server, or finds no tests](#--projectpwa-starts-the-dev-server-or-finds-no-tests)
- [Mock server](#mock-server)
  - [`<path>/<route> answered <status>: <body>. Is the control mounted…`](#pathroute-answered-status-body-is-the-control-mounted)
  - [Mock-server specs pass alone and fail in parallel](#mock-server-specs-pass-alone-and-fail-in-parallel)
- [Mailpit](#mailpit)
  - [`Mailpit GET <url> answered <status>`](#mailpit-get-url-answered-status)
  - [`No mail to <address> with a link matching <pattern> reached Mailpit`](#no-mail-to-address-with-a-link-matching-pattern-reached-mailpit)
- [Accessibility](#accessibility)
  - [`disableRules: "…" is disabled without a reason`](#disablerules--is-disabled-without-a-reason)
  - [`target-size [serious]` on a control a sticky bar half covers](#target-size-serious-on-a-control-a-sticky-bar-half-covers)
  - [`no element matches <actions>: the check cannot run`](#no-element-matches-actions-the-check-cannot-run)
  - [`the focused control ends <n>px under the sticky bar`](#the-focused-control-ends-npx-under-the-sticky-bar)
  - [`nothing is focused: focus a control before checking`](#nothing-is-focused-focus-a-control-before-checking)
  - [`the submit was not reached in <n> tabs`](#the-submit-was-not-reached-in-n-tabs)
  - [`color-contrast` fails, then passes on a retry](#color-contrast-fails-then-passes-on-a-retry)
  - [`expectNoHorizontalScroll` passes on a phone for a page that is clearly too wide](#expectnohorizontalscroll-passes-on-a-phone-for-a-page-that-is-clearly-too-wide)
  - [`The scroll container <tag#id.class> scrolls horizontally`](#the-scroll-container-tagidclass-scrolls-horizontally)
- [Responsive](#responsive)
  - [`Text overflows its box in <n> elements`](#text-overflows-its-box-in-n-elements)
  - [A clipped label fails although it shows a tooltip](#a-clipped-label-fails-although-it-shows-a-tooltip)
  - [`<n> tap targets are smaller than 44x44px`](#n-tap-targets-are-smaller-than-44x44px)
  - [A control with an enlarged hit area still fails `expectTapTargets`](#a-control-with-an-enlarged-hit-area-still-fails-expecttaptargets)
  - [A covered control is not reported by `expectTapTargets`](#a-covered-control-is-not-reported-by-expecttaptargets)
  - [`` expectTapTargets: `targets` is empty. ``](#expecttaptargets-targets-is-empty)
  - [`` expectTapTargets: `include` matched no element (<selectors>) ``](#expecttaptargets-include-matched-no-element-selectors)
  - [`` expectNoTextOverflow: `include` matched no element (<selectors>) ``](#expectnotextoverflow-include-matched-no-element-selectors)
  - [Tap targets pass in axe but fail `expectTapTargets`](#tap-targets-pass-in-axe-but-fail-expecttaptargets)
  - [Tap targets measure 36px on a phone viewport, but a phone gets 44px](#tap-targets-measure-36px-on-a-phone-viewport-but-a-phone-gets-44px)
  - [After `pointer: 'coarse'`, the page reports `hover: none` on Linux CI](#after-pointer-coarse-the-page-reports-hover-none-on-linux-ci)
  - [`` checkScreen: pointer: 'coarse' needs Chromium (it uses CDP touch emulation), but this page runs on <engine> ``](#checkscreen-pointer-coarse-needs-chromium-it-uses-cdp-touch-emulation-but-this-page-runs-on-engine)
  - [`` checkScreen: pointer must be 'fine' or 'coarse', got … ``](#checkscreen-pointer-must-be-fine-or-coarse-got-)
- [Content-Security-Policy](#content-security-policy)
  - [`Content-Security-Policy refusals`](#content-security-policy-refusals)
  - [`expectNoncedPage` failures](#expectnoncedpage-failures)
- [Auth and forms](#auth-and-forms)
  - [`Error reading storage state from playwright/.auth/<account>.json`](#error-reading-storage-state-from-playwrightauthaccountjson)
  - [`page.waitForURL: Test timeout of 30000ms exceeded.`](#pagewaitforurl-test-timeout-of-30000ms-exceeded)
  - [`expect(locator).toHaveValue(expected) failed` right after a fill](#expectlocatortohavevalueexpected-failed-right-after-a-fill)
- [Preview capture](#preview-capture)
  - [`Access denied to "…". See Vite config documentation for "server.fs"`](#access-denied-to--see-vite-config-documentation-for-serverfs)
  - [`Cannot modify file "…". File writing is disabled`](#cannot-modify-file--file-writing-is-disabled)
  - [`EncodingError: The source image cannot be decoded.`](#encodingerror-the-source-image-cannot-be-decoded)
  - [`This browser cannot encode WebP previews: canvas.toDataURL("image/webp") returned another format (WebKit does this). Capture with chromium or firefox.`](#this-browser-cannot-encode-webp-previews-canvastodataurlimagewebp-returned-another-format-webkit-does-this-capture-with-chromium-or-firefox)
  - [`The preview canvas is <width>x<height>: canvas.toDataURL returned "data:," because it is empty or beyond the browser's canvas size limit. Capture a smaller crop, or check that the story renders something.`](#the-preview-canvas-is-widthxheight-canvastodataurl-returned-data-because-it-is-empty-or-beyond-the-browsers-canvas-size-limit-capture-a-smaller-crop-or-check-that-the-story-renders-something)

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
| `.`, `./config`, `./pages`, `./auth`, `./helpers`, `./pwa`, `./csp`, `./react-router` | `@playwright/test` (the root re-exports `./screens`: see below) |
| `./a11y` | `@playwright/test`, `@axe-core/playwright` |
| `./screens` | `@playwright/test`, plus `@axe-core/playwright` when `checkScreen`'s scan runs (the default, or an options object) |
| `./msw` | `@playwright/test`, `msw`, `@msw/playwright` |
| `./mock-server` | `@playwright/test` |
| `./mailpit` | nothing (`fetch` only) |
| `./storybook`, `./storybook/capture`, `./storybook/setup` | `vitest`, `@vitest/browser-playwright`, `@storybook/addon-vitest` |

```sh
bun add -d @playwright/test msw @msw/playwright
```

### `Cannot find package 'msw'`

The message continues `imported from …/node_modules/@msw/playwright/…`.

**When:** importing `@nxgt/playwright/msw`, with `msw` 2 installed.
**Why:** `@msw/playwright` 0.7.x requires msw 3. Installed beside msw 2, it
cannot load msw at all. `@nxgt/playwright` supports `@msw/playwright`
`>=0.6.7 <0.8`: 0.6.x with msw 2, 0.7.x with msw 3.
**Fix:** on msw 2, keep `@msw/playwright` on 0.6, or move to msw 3.

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

**When:** the first `expectAccessible`, `accessibilityScan`, `a11y.expect()` or
`checkScreen` scan (the default, or an `a11y` options object) of a run.
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

### `` storybookProject: `executablePath` is a Chromium binary but `browsers` is [<list>]. Add 'chromium' or drop `executablePath`. ``

**When:** `storybookProject()` runs in the Vitest config.
**Why:** `executablePath` points at a Chromium binary, and `browsers` names
no `chromium` instance to give it to. Firefox and WebKit cannot launch it, so
the option is refused instead of being dropped silently.
**Fix:** add `'chromium'` to `browsers`, or remove `executablePath`.
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` does not trigger this: it is ignored
when there is no Chromium instance.

```ts
storybookProject({ browsers: ['chromium', 'firefox'], executablePath: '/usr/bin/chromium' });
```

### `` storybookProject: `browsers` is empty. Name at least one of chromium, firefox, webkit. ``

**When:** `storybookProject({ browsers: [] })`.
**Why:** an empty list would leave the project with no browser to run in.
**Fix:** drop the option for the default (`['chromium']`) or name the browsers.

### `` storybookProject: `capture` needs a single browser but `browsers` is [<list>]. Every browser writes the same preview file; name one. ``

**When:** `storybookProject({ capture: true, browsers: ['chromium', 'firefox'] })`.
**Why:** every browser writes the same preview file for a story, so the last
browser's render would win without a warning.
**Fix:** keep one browser for the project that captures, and the others on a
second `storybookProject` without `capture`:

```ts
projects: [
	storybookProject({ browsers: ['chromium', 'firefox'] }),
	storybookProject({ capture: true }),
],
```

### `` storybookProject: `capture` cannot use 'webkit' (`browsers` is [<list>]): WebKit cannot encode WebP previews. Capture with chromium or firefox. ``

**When:** `storybookProject({ capture: true, browsers: ['webkit'] })`, or any
`browsers` list that includes `'webkit'` with `capture`.
**Why:** the preview is encoded as WebP, and WebKit cannot encode WebP. The
config is refused up front instead of failing in the browser (see
[the runtime error](#this-browser-cannot-encode-webp-previews-canvastodataurlimagewebp-returned-another-format-webkit-does-this-capture-with-chromium-or-firefox)).
**Fix:** capture in `chromium` or `firefox`, and keep WebKit in a project
without `capture`:

```ts
projects: [
	storybookProject({ browsers: ['chromium', 'firefox', 'webkit'] }),
	storybookProject({ capture: true, browsers: ['chromium'] }),
],
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

### Tap targets measure 36px on a phone viewport, but a phone gets 44px

`expectTapTargets` (or `checkScreen`'s `tapTargets`) lists buttons smaller than
44x44 although the design enlarges them on touch.

**When:** a desktop Chromium project with a phone `viewport`, on a component
library that sizes targets under `@media (pointer: coarse)`.
**Why:** resizing the viewport does not change the pointer. `hasTouch` is a
context option fixed at creation, so the page keeps a fine pointer and the
desktop sizes apply.
**Fix:** `checkScreen(page, testInfo, 'home', { viewport: PHONE, tapTargets: true, pointer: 'coarse' })`.
Chromium only; see [guide/screens.md](guide/screens.md#one-call-per-screen-checkscreen).

### After `pointer: 'coarse'`, the page reports `hover: none` on Linux CI

No error: after `checkScreen(…, { pointer: 'coarse' })` or `withPointer(page,
'coarse', …)`, `@media (hover: hover)` and `(pointer: fine)` rules stop
matching on the same page, and a later check or screenshot judges it without
them. It passes on a Mac and fails on CI.

**When:** headless Chromium on a machine with no mouse (a Linux CI runner),
on the page the coarse check ran on. A new page is not affected.
**Why:** Playwright fakes a mouse in headless Chromium with
`--blink-settings=primaryPointerType=4,primaryHoverType=2,…`. Switching CDP
touch emulation off restores the pointer Chromium read from the machine
(none on the runner), not that faked one. No CDP call puts it back. A
navigation does on the Chromium of Playwright 1.64 (it applies the launch
settings again), but not on the one of Playwright 1.61, even for a reload. A
Mac has a trackpad, so its machine pointer is already a mouse.
**Fix:** make the coarse check the last one on that page, or carry on in a new
page:

```ts
await checkScreen(page, testInfo, 'home-touch', { pointer: 'coarse', tapTargets: true });
const next = await page.context().newPage(); // has the mouse Playwright fakes
```

### `` checkScreen: pointer: 'coarse' needs Chromium (it uses CDP touch emulation), but this page runs on <engine> ``

**When:** `pointer: 'coarse'` on a Firefox or WebKit project.
**Why:** the switch is Chrome DevTools Protocol, which only Chromium has.
Skipping it silently would measure the fine-pointer sizes and mislead.
**Fix:** run that check in a Chromium project, or give the Firefox or WebKit
project `hasTouch: true` (a WebKit phone device already has it).

### `` checkScreen: pointer must be 'fine' or 'coarse', got … ``

**When:** `pointer` is anything else (a typo such as `'touch'`, or a boolean from plain JavaScript).
**Why:** only the two pointers exist; guessing would measure the wrong sizes.
**Fix:** pass `'coarse'`, or `'fine'` / nothing for the project's own pointer.

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

### `defineAppConfig: screens.dir resolves to <dir>, which holds <folder>`

**When:** the first thing a run with `SCREENS=1` does, with `screens: { dir }`
set to `.`, `..`, `/` or any folder holding the config file or the specs.
**Why:** the global setup empties the screens folder recursively; emptying
that one would delete the project, so it refuses before touching anything.
**Fix:** give the screens a folder of their own.

```ts
export default defineAppConfig({ port: 5174, screens: { dir: './playwright/screenshots' } });
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
runner's answer to the workers. It reads the command line only: UI mode and
editor extensions pick projects without `--project`, and it gives `[]` there
(so keep an environment switch such as `PWA=1` beside it).

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

### `warm-up: <url> did not hydrate within <timeout>ms (…)`

The message continues with the number of attempts, the marker, and
`Last error: …`.

**When:** in the global setup `defineAppConfig({ warmUp })` adds, or in a call
to `warmUp()`, before the first spec.
**Why:** the page never hydrated while the setup reloaded it. A cold Vite
server is still optimizing dependencies (it answers 504 "Outdated Optimize
Dep"), or the marker is wrong: the app never sets it, or a function marker
throws in the page (a `ReferenceError` shows as the last error).
**Fix:** read the last error, raise `timeout` when the server is just slow,
and check `marker` against the one `withHydration` uses.

```ts
defineAppConfig({
	port: 5174,
	warmUp: { path: '/sign-in', timeout: 300_000, marker: reactRouterHydrated },
});
```

See [guide/hydration.md](guide/hydration.md#warming-a-cold-dev-server-up).

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

**When:** `expectNotCached(page, url)`. `<url>` is the string or pattern
you passed (`/^\/acc/ is cached: pages (/account)`), not the page's URL.
**Why:** the service worker stored a response that must not be kept. The
message names each cache and the entries that matched.
**Fix:** make the worker's caching rule skip that URL (a signed-in page, an
API answer). `cachedUrls(page)` lists everything cached, as path and query for
the page's origin. Cache Storage exists in a secure context only:
`http://localhost` is one, `about:blank` is not.

### `cachedUrls: <url> has no Cache Storage`

Also `fillCaches: <url> has no Cache Storage` and
`expectOnlyCaches: <url> has no Cache Storage`. The message continues `Open a page of the app first, on a secure origin
(https, or http://localhost); about:blank and page.setContent have none.` The
first word is the helper called: `cachedUrls`, `fillCaches` or
`expectOnlyCaches` (`expectNotCached` reports `cachedUrls`).

**When:** one of them runs before the spec opened a page of the app, on a
`page.setContent` document, or on an origin that is not secure (a dev server
opened by its LAN address, `http://192.168.…`).
**Why:** Cache Storage exists only in a secure context with a real origin.
**Fix:** `await page.goto('/')` first, on `localhost` or https.

### `Unexpected Cache Storage (caches left: …; caches missing: …)`

The message ends `present: <every cache name>`.

**When:** `expectOnlyCaches(page, keep)`.
**Why:** `caches left` are caches no matcher in `keep` keeps — the step under
test did not delete them; `caches missing` are exact names in `keep` that are
not there — the step deleted what it should have kept.
**Fix:** fix the app's clean-up, or `keep`. A string is an exact name that
must be there; use a pattern for a cache that may be absent:

```ts
await expectOnlyCaches(page, ['app-precache-v2', /^app-fonts-/]);
```

When the app deletes the caches after the step the spec awaited (a sign-out
that redirects first), retry: `await expect(() => expectOnlyCaches(page, keep)).toPass()`.

### Offline, the page shows the browser's error page, not the app's

No error from the package: a spec expecting the offline page sees
`ERR_INTERNET_DISCONNECTED`, or `page.goto` throws it.

**When:** the context went offline before a service worker controlled the
page — `context.setOffline(true)` by hand, or `goOffline(page, { worker: false })`
— or in a browser where offline does not reach the worker.
**Why:** an uncontrolled page's requests go straight to the network, which
is cut. The worker answers only for pages it controls.
**Fix:** use `goOffline(page)`, which waits for `serviceWorkerControlled`
first, in the Chromium project `pwaProject` builds.

### Offline, a fetch from the page still answers 200 on an older Playwright

No error from the package: after `goOffline(page)`, a `fetch` of a URL the
worker has not cached resolves with `200` instead of failing, and a spec that
expects `'failed'` (or the offline page) fails on it.

**When:** `@playwright/test` is older than 1.61 (the peer range starts there).
**Why:** before 1.61, `context.setOffline(true)` does not reach the service
worker's own fetches, so the worker keeps reaching the network. Measured here:
1.55.1, 1.56.1, 1.57.0, 1.58.2, 1.59.1 and 1.60.0 fail, 1.61.0 and later pass.
**Fix:** upgrade `@playwright/test` to 1.61 or newer.

### `nextWorkerVersion: no service worker is registered for <url>`

The message continues `Wait for it first: serviceWorkerControlled(page).`

**When:** `nextWorkerVersion` on a page whose worker has not registered yet,
or in a context that never opened the app (a new `browser.newPage()`).
**Fix:** open the app and `await serviceWorkerControlled(page)` before it.

### `nextWorkerVersion: the browser found no new worker after editing <path>`

The message continues `Is it the file the server sends for the registered
script, read anew per request (not kept in memory, nor cached by a CDN)?`

**When:** `registration.update()` fetched the worker and found the bytes it
already has.
**Why:** `file` is not the script the server sends (another build folder, a
source file the build copies), or the server keeps static files in memory.
**Fix:** point `file` at the built script, relative to the folder Playwright
runs in (usually the config's), and serve the build with a server that reads
files per request. The file was restored either way.

```ts
await nextWorkerVersion(page, { file: 'build/client/service-worker.js' });
```

### `nextWorkerVersion: the new worker failed to install (redundant)`

Or `nextWorkerVersion: the new worker did not install within <timeout>ms:
still installing.`

**When:** the new version was found, but its `install` handler rejected (a
precache request failed, often against a server with no backend) or took
longer than `timeout`.
**Why:** a worker whose `install` rejects is discarded; the old one stays.
**Fix:** read the worker's errors (DevTools, `page.context().serviceWorkers()`),
make every precached URL answer without a backend, or raise `timeout`. An
`edit` that breaks the script fails the same way: the default only appends a
comment.

### `Timed out waiting 180000ms from config.webServer` on the PWA run

**When:** `pwaProject`'s server was built but never answered `readyPath`
(`/` by default) with a 2xx or 3xx status.
**Why:** the build failed (its output is above the message), the start
script ignores `PORT`, or `/` needs a backend nobody started and answers 500.
**Fix:** make `start` listen on `PORT`, and await a path that needs nothing
else:

```ts
pwaProject({ port: 5274, readyPath: '/manifest.webmanifest', webServer: { stderr: 'ignore' } });
```

### `--project=pwa` starts the dev server, or finds no tests

**When:** the config builds the PWA run on something that differs between
the runner and its workers (`process.argv`), or `pwaProject`'s `name` is not
the one `isPwaRun` looks for.
**Fix:** pick the run with `isPwaRun()` (it reads `--project` through
`selectedProjects`, and `PWA=1` for UI mode), and give both the same name:

```ts
const offline = isPwaRun({ project: 'offline' });
export default defineAppConfig(offline ? pwaProject({ port: 5274, name: 'offline' }) : { port: 5273 });
```

## Mock server

### `<path>/<route> answered <status>: <body>. Is the control mounted…`

The full message is `<path>/<route> answered <status>: <body>. Is the control
mounted (createMockControl().handle) and NODE_ENV not production?`, for example
`/__mocks/reset answered 404: …`. It is thrown by `mockServer.reset()`,
`fail`, `scenario` or `use`, and by the automatic reset before and after every
test, so it can fail a test that never touches `mockServer`.

**When:** a spec using `createMockServerTest`.
**Why:** the status says which. 404 on every route: the app does not mount the
control at that path, the `path` option differs from the app's, or the server
runs in production, `NODE_ENV=production` or a Vite production build (the control refuses to exist there). 404 on
`scenario`, with a body naming the scenario: no such name is registered.
405, 415: the route was not called with a JSON `POST`. 400: bad input, such as
a `fail` status outside 100-599. 500: the app's `reset` or scenario threw.
The `<body>` is the control's own answer; read it first. A connection error
instead means the server is not running at `baseURL`.
**Fix:** mount the control and match the path.

```ts
// the app's server entry
const { control } = startMockServer(handlers, { path: '/__mocks' });
app.all('/__mocks/*', async ({ request }) =>
	(await control.handle(request)) ?? new Response(null, { status: 404 }),
);
```

```ts
export const test = createMockServerTest(base, { path: '/__mocks' });
```

See [guide/mock-server.md](guide/mock-server.md).

### Mock-server specs pass alone and fail in parallel

**When:** `mockServer` or `serverMocks` specs run with more than one worker,
or beside other spec files against one server. Symptoms: a page shows the
error of another test's `fail(503)`, an override is missing, or the above
error for no apparent reason.
**Why:** the mocks live in the app's one server process and are global to it;
workers reset and change each other's mocks. Measured here: the contract spec
failed 11 of 18 run in parallel with the other specs.
**Fix:** scope the mocks per worker with `createMockServerTest(base, { scope: true })`
and have the app forward the scope (`withScope(scopeOf(request), …)` from
`@nxgt/msw-graphql`, see the [guide](guide/mock-server.md#parallel-workers-the-scope-option)),
or run those specs in a project with one worker.

```ts
export default defineAppConfig({
	port: 5174,
	overrides: { workers: 1, fullyParallel: false },
});
```

Or give each worker a server of its own on its own port.

## Mailpit

### `Mailpit GET <url> answered <status>`

For example `Mailpit GET http://localhost:8025/api/v1/search?query=… answered 404`
(or `DELETE …/api/v1/messages answered …` from `clear()`).

**When:** any method of the object `mailpit()` returns.
**Why:** the URL is the one that was called. A 404 usually means `url` points
at something that is not Mailpit's HTTP port (8025 is the web and API port,
1025 is SMTP), or at a Mailpit older than API v1. 401 or 403: Mailpit runs with
UI authentication. A connection error instead means Mailpit is not running.
**Fix:** point `url` (or `E2E_MAILPIT_URL`) at the HTTP port.

```ts
const mail = mailpit({ url: 'http://localhost:8025' });
```

### `No mail to <address> with a link matching <pattern> reached Mailpit`

The full message ends with `at <url> within <timeout> ms`.

**When:** `waitForLink` found no message to the address with a link the
pattern accepts before the timeout.
**Why:** the app did not send the mail (its SMTP settings do not point at
Mailpit's port 1025), it sent it to another address (the search is
`to:"<address>"`), or `match` tests something the link does not contain: it is
tested against each link alone, after `&amp;` is decoded, not against the body.
**Fix:** open the Mailpit UI at the same URL and compare. Read the real links
with `latest`, and widen the pattern or the timeout.

```ts
console.log((await mail.latest({ to }))?.links);
const link = await mail.waitForLink({ to, match: /\/reset\?/, timeout: 30_000 });
```

See [guide/mailpit.md](guide/mailpit.md).

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

### `target-size [serious]` on a control a sticky bar half covers

```
1. target-size [serious] All touch targets must be 24px large, or leave sufficient space
```

The node is a control under a sticky header or near a bottom bar, and the
failure comes and goes with where the page stopped scrolling (a form that
scrolls its first invalid field to the top, a spec that scrolled a little). In
the raw `accessibilityScan` result, the node's message reads "Target has
insufficient size because it is partially obscured".

**When:** a bar is `position: sticky` or `fixed` (a form's actions bar at the
bottom, as `@nxgt/material` 2.20 does on `[data-slot="form-actions"]`, or an
app header at the top) and covers part of a control at scan time.
**Why:** axe measures what is left of the control around the bar, under 24x24
CSS pixels. The control's own size is fine (WCAG 2.5.8); that it can hide
under a bar is Focus Not Obscured (2.4.11), which axe does not check.
**Fix:** none needed for form actions: since 0.6.0 the scan puts
`DEFAULT_UNSTICK` back in the flow while axe runs and restores it. List your
own bars, a sticky header included, beside it (`unstick` takes any selector);
check 2.4.11 in your own spec. There is no need to exclude the covered
controls and scan them apart.

```ts
import { DEFAULT_UNSTICK, expectAccessible } from '@nxgt/playwright/a11y';

await expectAccessible(page, {
	unstick: [...DEFAULT_UNSTICK, '.app-header', '.app-bottom-bar'],
});
```

### `no element matches <actions>: the check cannot run`

**When:** `expectFocusAboveActions` or `expectFieldsAboveActions` finds no
element for the `actions` selector (default `[data-slot="form-actions"]`).
**Why:** a page with no bar has nothing to be obscured by, but a check that
passes there would hide a renamed or not yet rendered bar. It fails instead.
**Fix:** wait for the form to render, or pass your bar's selector.

```ts
await expectFieldsAboveActions(page, { actions: '.app-bottom-bar' });
```

### `the focused control ends <n>px under the sticky bar`

```
the focused control ends 10px under the sticky bar [data-slot="form-actions"] (WCAG 2.4.11 Focus Not Obscured): input #f2 name="f2" <input id="f2" name="f2">. Give the scroll container a scroll-padding-bottom the height of the bar, and the control (or its field) a scroll-margin-bottom for the error line beneath it.
```

**When:** the focused control, or its field (an error line under it), is
hidden under the sticky bar.
**Why:** the browser scrolls a focused control only until it is in view, and
the bar covers the bottom of the view.
**Fix:** reserve the bar's height where the page scrolls, in your CSS, not in
the spec. If the control is the problem and its field's error is not, set
`field` to the right wrapper.

```css
html { scroll-padding-bottom: 6rem; } /* the bar's height */
input, select, textarea { scroll-margin-bottom: 4rem; } /* room for the error line */
```

### `nothing is focused: focus a control before checking`

**When:** `expectFocusAboveActions` runs while the page itself has focus.
**Fix:** focus a control first (`await page.getByLabel('Name').focus()`).
`expectFieldsAboveActions` may start there: its first Tab lands on the first control.

### `the submit was not reached in <n> tabs`

**When:** `expectFieldsAboveActions` pressed Tab `limit` times (40) without
focusing the `until` control (by default the first `[type="submit"]` in the bar).
**Why:** a longer form, a submit that is not a `[type="submit"]`, or a focus
that leaves the form (a focus trap or a control outside it).
**Fix:** raise `limit`, or name where to stop. The message names the locator.

```ts
await expectFieldsAboveActions(page, {
	limit: 80,
	until: page.getByRole('button', { name: 'Save' }),
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

### A screenshot or scan shows the old and new content on top of each other

Two states of the same area are drawn at once: the button that was clicked and
the content that replaced it, half transparent.

**When:** right after an action that runs a view transition (React's
`<ViewTransition>`, `document.startViewTransition`).
**Why:** a view transition draws a snapshot of the old state over the new one
until its `::view-transition-*` animations end, and creates those animations
only once the new state is rendered. Before 0.9.7, `settled` saw no animation
yet and resolved at once.
**Fix:** call `settled(page)` after the action, on 0.9.7 or newer: it awaits
`document.activeViewTransition` first. In a browser that does not expose it,
wait for the new content before settling.

```ts
await page.getByRole('button', { name: 'Go' }).click();
await expect(page.getByText('Done')).toBeVisible();
await settled(page);
await page.screenshot({ path: 'done.png' });
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

## Responsive

### `Text overflows its box in <n> elements`

The message continues `(412x839 viewport):` and lists the boxes, each as
`tag#id.class`, `clipped` or `spills`, the text, and the widths. For a single
box it says `1 element`.

**When:** `expectNoTextOverflow`, or `checkScreen` with `textOverflow`.
**Why:** a text is wider (or, in a clamped box, taller) than its box. `spills`:
the box leaves it visible, so it runs over what is beside it. `clipped`: the
box hides the rest (`overflow: hidden`, usually with `text-overflow: ellipsis`
or a line clamp) and nothing gives the full text.
**Fix:** let the text wrap (`white-space: normal`, a `min-width: 0` on a flex
child), widen the box, or, for a clipped text that is meant to be, give it
its full text in a `title` or `aria-label`, or leave the box out:

```html
<span class="title" title="Quarterly report for the whole group">Quarterly report for the whole group</span>
```

`expectNoTextOverflow(page, { exclude: '.marquee' })` leaves a box out. A text
under a CSS `transform`, `scale` or `rotate`, in shadow DOM or in an iframe is
never reported: the check does not measure it.

### A clipped label fails although it shows a tooltip

**When:** the label is cut with an ellipsis, a tooltip shows the full text on
hover, and the check still says `clipped … no title`.
**Why:** the check reads attributes, not what a script draws on hover. A
tooltip component's popup is not a `title`.
**Fix:** add `title` or `aria-label` with the full text to the box (or to the
link around it that holds nothing else), or exclude the box.

### `<n> tap targets are smaller than 44x44px`

The message continues `(412x839 viewport):` and lists the targets, each as
`tag#id.class "name"` with its size; for a single one it says `1 tap target is`.

**When:** `expectTapTargets`, or `checkScreen` with `tapTargets`.
**Why:** a link, button or control is smaller than a thumb: an icon button of
32px, a text link whose box is 20px tall. With `spacing: true` a smaller one
also fails when another target is within `size` of it (`, too close to <x>`).
**Fix:** grow the element's own box, with `padding` or `min-width` and
`min-height`, give it a hit area (see
[the next entry](#a-control-with-an-enlarged-hit-area-still-fails-expecttaptargets)),
or leave the target out:

```css
.icon-button { min-width: 44px; min-height: 44px; }
```

`expectTapTargets(page, { exclude: '.legal a' })` leaves a target out;
`{ size: 24 }` asks for WCAG 2.5.8's minimum instead.

### A control with an enlarged hit area still fails `expectTapTargets`

**When:** a checkbox, a switch or a close button has an invisible 44px
`::before` / `::after`, and `expectTapTargets` still reports its 20px box.
**Why:** since 0.9.0 the check probes the real hit area (`hitArea`, on by
default) and fails when a probe of the `size` square lands on another element.
The usual causes:

- the pseudo-element is `pointer-events: none`, or smaller than `size`;
- a neighbour covers part of the square, or an ancestor's `overflow` clips
  it. Since 0.9.1 a sticky bar the control merely sits under no longer fails
  it: the check scrolls it clear and probes again. Since 0.9.4 a floating layer
  over part of it (role `menu`, `listbox`, `dialog`, `alertdialog`,
  `tooltip`, `status` or `alert`, an open popover or `<dialog>`, positioned
  `fixed` / `absolute` or in the top layer) is measured through and put back
  afterwards; a neighbour without such a role, or in the flow, is not. Since
  0.9.6 so is a positioned wrapper that holds only such a layer (a popper's
  content wrapper);
- the rule is under `@media (pointer: coarse)` and the project is a desktop
  one: only the mobile project emulates a coarse pointer;
- the control is fixed at the viewport's edge, so its whole hit area is not on
  screen.

**Fix:** make the pseudo-element hit-testable and as large as `size`, or run
the check in the project the rule is for
(`tapTargets: (info) => isMobileProject(info)`). The full rules are in
[the real hit area](guide/helpers.md#the-real-hit-area-hitarea-on-by-default);
`hitArea: false` judges the visible box only.

### A covered control is not reported by `expectTapTargets`

**When:** a small control you expect in the report is missing while a toast,
an open modal menu or a sheet is on screen, or it is the button of a toast
stacked behind the front one.
**Why:** since 0.9.2 an undersized control that another element still covers
once scrolled to the middle (at the centre of each of its boxes and labels) is out of reach in that state, so it
is not judged (nor counted as a neighbour for `spacing`). The layer's own
controls are judged as usual.
Since 0.9.3, while a modal layer is open (a modal `<dialog>`, a shown
`aria-modal="true"` element, or a body with `pointer-events: none`, as a modal
Radix menu leaves it), a control under `aria-hidden="true"` is not measured
either, even where the layer does not cover it.
**Fix:** check the control in the state where it is shown: close the toast or
the menu (`toastsGone`, `Escape`) before the call. `hitArea: false` judges
every visible box, covered or not; it does not bring back a control under
`aria-hidden` while a modal layer is open: close the layer first.

### `` expectTapTargets: `targets` is empty. ``

**When:** `expectTapTargets(page, { targets: [] })`, for example a list built
from a filter that matched nothing.
**Why:** an empty list is no selector at all, and there is nothing to measure.
**Fix:** name at least one selector, or drop `targets` for `DEFAULT_TAP_TARGETS`
(spread it to add to it).

### `` expectTapTargets: `include` matched no element (<selectors>) ``

**When:** `expectTapTargets` (or `checkScreen` with `tapTargets`), and none of
`include`'s selectors is in the page. `expectNoTextOverflow` says the same with
its own name.
**Why:** a typo, or a page that has not rendered that part yet. The check
would otherwise measure nothing and pass.
**Fix:** correct the selector, wait for the content before checking, or drop
`include` to check the whole page.

### `` expectNoTextOverflow: `include` matched no element (<selectors>) ``

**When:** `expectNoTextOverflow` (or `checkScreen` with `textOverflow`), and
none of `include`'s selectors is in the page.
**Why and fix:** as for
[`expectTapTargets`](#expecttaptargets-include-matched-no-element-selectors):
correct the selector, wait for the content, or drop `include` to check the
whole body.

### Tap targets pass in axe but fail `expectTapTargets`

**When:** `expectAccessible` is green and `expectTapTargets` reports a 32px
button.
**Why:** two different bars. axe's `target-size` rule is WCAG 2.5.8: 24x24px,
or a smaller target with enough space around it. `expectTapTargets` asks for
44x44px, the comfortable touch size, so it is off by default in `checkScreen`.
**Fix:** none is needed for WCAG 2.5.8. Keep the check for phones
(`tapTargets: (info) => isMobileProject(info)`), or set `size: 24`.

## Content-Security-Policy

### `Content-Security-Policy refusals`

The report of a test using `withCspGuard` or `cspTest`:
`expect(received).toEqual(expected)` with the message
`Content-Security-Policy refusals` and an array of lines.

A page of the test ran something its policy refuses. A line is either
`<directive> refused <blocked URL or inline> in <page> (<file:line> <sample>)`,
from a `securitypolicyviolation` event, or `console: <text> (<url>)`, a
console error that names the policy (the same refusal is usually reported
twice). Add the nonce to the inline script or load it from an allowed source;
do not loosen the policy to silence the test. A refusal that comes from a
browser extension or a third-party widget you cannot change belongs to a test
that uses plain `test`, not `cspTest`.

```ts
import { test as base } from '@playwright/test';
import { withCspGuard } from '@nxgt/playwright/csp';

export const test = withCspGuard(base); // every test of this file is guarded
```

The guard only sees pages opened after the fixture starts, and a refusal
that happens after the test body ended is not reported.

### `expectNoncedPage` failures

- `content-security-policy has no 'nonce-…' of 16+ base64 characters in script-src`:
  the response has no header, or its `script-src` names no nonce (a nonce in
  `style-src` does not count). The message prints the policy it got.
- `no <script> or <link rel="modulepreload"> to carry the nonce`: the HTML
  holds nothing to check; point the check at a page that loads scripts.
- `tags without the policy's nonce`: the array lists the tags whose `nonce`
  attribute is missing or differs from the policy's. The raw HTML is read, since
  browsers hide `nonce` from the DOM.
- `the nonce is the same on a second load`: the nonce is cached or built once.
  It must be new on every response, so a cached HTML page cannot be nonced.
- `script-src`: with the `scriptSrc` option, the directive differs; the
  nonce is written `{nonce}` in the expected value.

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

### `This browser cannot encode WebP previews: canvas.toDataURL("image/webp") returned another format (WebKit does this). Capture with chromium or firefox.`

The config-time twin of this error is [``storybookProject: `capture` cannot use 'webkit' …``](#storybookproject-capture-cannot-use-webkit-browsers-is-list-webkit-cannot-encode-webp-previews-capture-with-chromium-or-firefox).

**When:** a `storybookProject({ capture })` runs in a browser that cannot encode
WebP (WebKit).
**Why:** the preview is encoded with `canvas.toDataURL('image/webp')`. WebKit
cannot encode WebP and silently returns PNG data, which would be saved under a
`.webp` name. Chromium and Firefox encode it.
**Fix:** capture in `chromium` or `firefox`, and keep WebKit in a project
without `capture`.

```ts
projects: [
	storybookProject({ browsers: ['chromium', 'firefox', 'webkit'] }),
	storybookProject({ capture: true, browsers: ['chromium'] }),
]
```

### `The preview canvas is <width>x<height>: canvas.toDataURL returned "data:," because it is empty or beyond the browser's canvas size limit. Capture a smaller crop, or check that the story renders something.`

**When:** a `storybookProject({ capture })` run, in any browser, on a story whose
cropped preview is empty or very large.
**Why:** `canvas.toDataURL` answers `"data:,"` for a canvas with a zero width or
height (the story rendered nothing, or the crop is empty) and for one beyond the
browser's canvas size limit. That is not the browser's fault, so it is not the
[WebP error](#this-browser-cannot-encode-webp-previews-canvastodataurlimagewebp-returned-another-format-webkit-does-this-capture-with-chromium-or-firefox).
**Fix:** read the width and height in the message. `0` means the story renders
nothing: check it renders, and that `play` has finished. A very large value
means a crop to shrink: capture a smaller area.

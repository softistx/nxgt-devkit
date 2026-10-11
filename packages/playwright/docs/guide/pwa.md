# PWA

Specs for an app with a service worker, from `@nxgt/playwright/pwa` (also the
root). They need only `@playwright/test`.

| Export | What it does |
| --- | --- |
| [`pwaProject`](#pwaproject-and-ispwarun), [`isPwaRun`](#pwaproject-and-ispwarun) | a run that is the PWA project alone, against a production build |
| [`serviceWorkerControlled`](#serviceworkercontrolled) | waits for a worker to control the page |
| [`goOffline`, `goOnline`](#gooffline-and-goonline) | cuts the network once the worker is in charge, and gives it back |
| [`nextWorkerVersion`](#nextworkerversion) | makes a new version of the worker appear, as a deploy would |
| [`cachedUrls`](#cachedurls) | every Cache Storage entry, by cache |
| [`expectNotCached`](#expectnotcached) | fails when a URL that must never be kept is |
| [`fillCaches`, `expectOnlyCaches`](#fillcaches-and-expectonlycaches) | what a sign-out or a new worker's `activate` leaves of the caches |

```ts
// playwright/pwa/offline.spec.ts
import { expect, test } from '@playwright/test';
import { expectNotCached, goOffline, goOnline, serviceWorkerControlled } from '@nxgt/playwright/pwa';

test('offline, a page load shows the offline page', async ({ page }) => {
	await page.goto('/');
	await goOffline(page); // once the worker controls the page
	await page.goto('/projects');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('You are offline');
	await goOnline(page);
});

test('keeps nothing private', async ({ page }) => {
	await page.goto('/projects');
	await serviceWorkerControlled(page);
	await expectNotCached(page, '/account');
	await expectNotCached(page, /^\/api\//);
});
```

## `pwaProject` and `isPwaRun`

Most frameworks register the worker in a production build only (Vite's dev
server does not), so PWA specs run against a build, on a port of their own,
as a project that runs alone — while every other project keeps the dev
server and its mocks. `pwaProject` gives `defineAppConfig` the options of that
run; `isPwaRun` tells which run this is.

```ts
// playwright.config.ts
import { defineAppConfig } from '@nxgt/playwright/config';
import { isPwaRun, pwaProject } from '@nxgt/playwright/pwa';

export default defineAppConfig(
	isPwaRun()
		? pwaProject({ port: 5274 })
		: { port: 5273, setup: true, mobile: true, env: { MOCK_API: '1' } },
);
```

```bash
bunx playwright test                  # the dev server, every other project
bunx playwright test --project=pwa    # bun run build && bun run start on :5274, playwright/pwa
PWA=1 bunx playwright test --ui       # the same in UI mode
```

```ts
type PwaProjectOptions = {
	port: number;                       // PW_PORT wins
	name?: string;                      // 'pwa'
	testDir?: string;                   // './playwright/pwa'
	build?: string | false;             // 'bun run build'; false serves a build already made
	start?: string;                     // 'bun run start', run with PORT=<port>
	readyPath?: string;                 // '/', the path the server is awaited on
	env?: Record<string, string>;       // more environment for the server
	webServer?: Partial<WebServerConfig>; // merged over the preset (stderr, timeout, env…); PORT stays the preset's
	use?: Project['use'];               // merged over Desktop Chrome, serviceWorkers: 'allow'
	overrides?: PlaywrightTestConfig;   // merged last; its projects come after this one
};

function pwaProject(options: PwaProjectOptions): AppConfigOptions;
function isPwaRun(options?: { project?: string; env?: string }): boolean; // 'pwa', 'PWA'
```

What the run is:

- **one project**, `pwa`, in Chromium (`Desktop Chrome`), with
  `serviceWorkers: 'allow'`, its specs in `./playwright/pwa`. No other
  browser, no phone and no `setup` project: the specs are signed out unless
  they sign in themselves. Chromium is where Playwright can ask for
  installability (CDP's `Page.getInstallabilityErrors`) and where
  `context.setOffline` reaches the worker's own fetches.
- **a web server** running `<build> && <start>` with `PORT=<port>` in its
  environment (no shell syntax, so it works on Windows too), awaited on
  `http://localhost:<port><readyPath>` for up to 180 s, reused locally and
  fresh on CI like `defineAppConfig`'s.
- **no mocks.** A production build ignores a mock flag; nothing in the
  preset sets one. A loader that calls a backend nobody started fails, so
  pick a `readyPath` that needs none (a static file such as
  `/manifest.webmanifest`) and quiet the server with
  `webServer: { stderr: 'ignore' }` if its errors are expected.

```ts
pwaProject({
	port: 5274,
	readyPath: '/manifest.webmanifest',
	webServer: { stderr: 'ignore' }, // no backend behind this build
	overrides: { workers: 1 },       // nextWorkerVersion edits a shared file
});
```

Shared options go beside it: `defineAppConfig({ ...pwaProject({ port: 5274 }), testIdAttribute: 'data-testid' })`.

`isPwaRun()` is `true` when the command line selects `--project pwa` (read
through [`selectedProjects`](config.md#selectedprojects), so the workers
agree) or when `PWA=1`: UI mode and editor extensions pick projects without
`--project`. `isPwaRun({ project: 'offline', env: 'E2E_OFFLINE' })` for other
names; give `pwaProject` the same `name`.

## `serviceWorkerControlled`

Polls `navigator.serviceWorker.controller` until a worker controls the page.

```ts
function serviceWorkerControlled(page: Page, options?: { timeout?: number }): Promise<void>; // timeout default 15_000
```

It throws when none does:

```
No service worker controls <url> after 15000ms: is it registered in this build, and does it call clients.claim()? Playwright's `serviceWorkers` must not be 'block'.
```

A first visit is not controlled until the worker has activated and called
`clients.claim()`; otherwise the page is controlled from the next load.

## `goOffline` and `goOnline`

```ts
function goOffline(page: Page, options?: { worker?: boolean; timeout?: number }): Promise<void>;
function goOnline(page: Page): Promise<void>;
```

`goOffline` waits for `serviceWorkerControlled(page)`, then
`page.context().setOffline(true)`; `goOnline` sets it back. Offline before the
worker controls the page, a load shows the browser's own error page, not the
worker's answer — the wait is what makes the spec test the worker.

- The whole **context** goes offline: every page of it, until `goOnline` or
  the context closes.
- `{ worker: false }` skips the wait, for an app without a worker (an
  offline banner, a failed fetch's message).
- `timeout` is the worker wait's (15 s).

```ts
test('a client-side navigation says the app is offline', async ({ page }) => {
	await page.goto('/');
	await goOffline(page);
	await page.getByRole('link', { name: 'Settings' }).click();
	await expect(page.getByRole('alert')).toHaveText(/offline/);
	await goOnline(page);
	await page.getByRole('button', { name: 'Try again' }).click();
	await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});
```

## `nextWorkerVersion`

An update prompt ("A new version is available — Reload") needs a new worker
version during the spec. Playwright cannot route a worker's update check, so
`nextWorkerVersion` makes one the way a deploy does: it edits the worker's
script on disk, calls `registration.update()` in the page, and restores the
file at once.

```ts
type NextWorkerVersionOptions = {
	file: string;                         // the worker script the server sends, relative to the current directory
	edit?: (source: string) => string;    // default: appendVersionComment, a comment appended
	timeout?: number;                     // for the new worker to install, 15_000
};

function nextWorkerVersion(page: Page, options: NextWorkerVersionOptions): Promise<void>;
```

It resolves once the new worker has **installed**: waiting, or already active
when it calls `skipWaiting()`.

```ts
// playwright/pwa/update.spec.ts
import { expect, test } from '@playwright/test';
import { nextWorkerVersion, serviceWorkerControlled } from '@nxgt/playwright/pwa';

test('an update waits for Reload', async ({ page }) => {
	let loads = 0;
	await page.goto('/');
	await serviceWorkerControlled(page);
	page.on('load', () => loads++);

	await nextWorkerVersion(page, { file: 'build/client/service-worker.js' });

	await expect(page.getByRole('status')).toContainText('New version available');
	expect(loads).toBe(0); // offered, never forced
	await page.getByRole('button', { name: 'Reload' }).click();
	await expect.poll(() => loads).toBe(1);
});
```

What it needs:

- **A server that reads the script per request.** A production server of
  static files usually does; one that keeps files in memory, or a CDN in
  front, sends the old bytes and nothing happens.
- **A worker already registered** for the page: call
  `serviceWorkerControlled(page)` first.
- **One spec at a time on the file.** It is shared: run the PWA project with
  one worker (`overrides: { workers: 1 }`), or keep the update specs in one
  serial file.

It throws, the file restored each time, when:

```
nextWorkerVersion: no service worker is registered for <url>. Wait for it first: serviceWorkerControlled(page).
nextWorkerVersion: the browser found no new worker after editing <path>. Is it the file the server sends for the registered script, read anew per request (not kept in memory, nor cached by a CDN)?
nextWorkerVersion: the new worker did not install within <timeout>ms: still installing.
nextWorkerVersion: the new worker failed to install (redundant): …
nextWorkerVersion: the page navigated away while the new worker installed: let the call finish first.
nextWorkerVersion: the edit left <path> as it was; the browser would see no new worker.
```

The restored file is one more version for the browser: a later update check
(a navigation may run one) installs it as yet another worker. A spec that
counts updates makes its counts before navigating away.

## `cachedUrls`

Every Cache Storage cache of the page's origin, by name.

```ts
function cachedUrls(page: Page): Promise<Record<string, string[]>>;
```

A URL of the page's origin is given as path and query; another origin's in
full.

```ts
await expect
	.poll(() => cachedUrls(page))
	.toEqual({ 'app-v1': ['/projects', '/assets/app.js', 'https://cdn.example.com/font.woff2'] });
```

Poll it: a worker fills its caches after it takes control. A check that reads
paths only must allow for the query: `/\.json(\?|$)/`, not `/\.json$/`.

## `expectNotCached`

Fails when any cache holds the URL, naming the caches that do. For what must
never be kept: a signed-in page, an API answer, a file behind a session.

```ts
function expectNotCached(page: Page, url: string | RegExp): Promise<void>;
```

A string matches a whole entry (path and query as `cachedUrls` gives it); a
pattern is tested against each entry.

```
/^\/acc/ is cached: pages (/account); …
```

## `fillCaches` and `expectOnlyCaches`

A sign-out must delete the caches that hold the user's data and keep the rest
(the precache: the offline page, the app's code); a new worker's `activate`
must delete the old version's. `fillCaches` makes the caches to delete —
under a dev server, where no worker runs, or before the worker has cached
anything — and `expectOnlyCaches` checks what is left.

```ts
type CacheMatcher = string | RegExp | ((name: string) => boolean);

function fillCaches(page: Page, names: readonly string[]): Promise<void>;
function expectOnlyCaches(page: Page, keep: CacheMatcher | readonly CacheMatcher[]): Promise<void>;
```

```ts
// playwright/e2e/sign-out.spec.ts — against the dev server
import { expectOnlyCaches, fillCaches } from '@nxgt/playwright/pwa';
import { CACHE_NAMES } from '../../app/pwa/cache-names'; // the app's own list

test('signing out keeps the precache alone', async ({ page }) => {
	await page.goto('/projects');
	await fillCaches(page, Object.values(CACHE_NAMES));
	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page).toHaveURL('/sign-in');
	await expectOnlyCaches(page, CACHE_NAMES.precache);
});
```

- `fillCaches` opens each cache and puts one entry,
  `/__nxgt-filled/<name>` (`filledCacheUrl(name)`), so a cache that is never
  emptied shows in `cachedUrls`.
- In `keep`, a **string** is an exact name that must be there; a **pattern**
  or a **predicate** keeps what it matches and requires nothing. Any other
  cache fails the check:

  ```
  Unexpected Cache Storage (caches left: app-pages-v1; caches missing: app-precache-v1); present: app-pages-v1
  ```

- It reads the caches once. When the app deletes them after the step the
  spec awaited, retry it: `await expect(() => expectOnlyCaches(page, keep)).toPass()`.
- `cacheProblems(names, keep)` is the pure check, `{ unexpected, missing }`,
  for a test of your own.

The cache names are the app's: import them from where the worker reads them,
never copy them into the spec.

## Run it against a build

- Cache Storage exists only in a secure context, on a real origin.
  `http://localhost` is one; `about:blank` and `page.setContent` are not:

  ```
  cachedUrls: about:blank has no Cache Storage. Open a page of the app first, on a secure origin (https, or http://localhost); about:blank and page.setContent have none.
  ```

- Playwright's `serviceWorkers` must not be `'block'` (the default is
  `'allow'`; `pwaProject` sets it).
- `fillCaches` and `expectOnlyCaches` need no worker: they run against a dev
  server too.

## What stays in the app

The rules the worker applies are the app's, and so are their checks: which
paths are static, that a framework's data requests (React Router's `.data`,
a GraphQL endpoint) are never stored, the precache's content against the
build's manifest, the offline page's words, the manifest's fields. Write them
with `cachedUrls` and `expectNotCached`; read the framework's own globals in
the app's specs.

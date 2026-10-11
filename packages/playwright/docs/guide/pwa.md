# PWA

Checks for an app with a service worker: `serviceWorkerControlled`,
`cachedUrls` and `expectNotCached`, from `@nxgt/playwright/pwa` (also the
root). They need only `@playwright/test`.

```ts
import { expect, test } from '@playwright/test';
import { expectNotCached, serviceWorkerControlled } from '@nxgt/playwright/pwa';

test('the worker controls the app and keeps nothing private', async ({ page }) => {
	await page.goto('/projects');
	await serviceWorkerControlled(page);
	await expectNotCached(page, '/account');
	await expectNotCached(page, /^\/api\//);
});
```

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

Poll it: a worker fills its caches after it takes control.

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

## Run it against a build

- Cache Storage exists only in a secure context. `http://localhost` is one;
  `about:blank` and `page.setContent` are not.
- Most frameworks register the worker in a production build only (Vite's dev
  server does not), so PWA specs usually run against a build, on a port of
  their own, as a project that runs alone. The config for it is in
  [config.md](config.md#a-project-that-runs-alone):
  `selectedProjects().includes('pwa')`.
- Playwright's `serviceWorkers` must not be `'block'` (the default is
  `'allow'`).

```bash
bunx playwright test --project=pwa
```

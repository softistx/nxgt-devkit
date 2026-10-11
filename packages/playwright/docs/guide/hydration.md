# Hydration

Wait for a server-rendered page to be interactive before a spec touches it:
`hydrated` for one page, `withHydration` so that every `goto` does it, and an
adapter for React Router, from `@nxgt/playwright/helpers` (also the root) and
`@nxgt/playwright/react-router`.

```ts
// playwright/support/test.ts
import { test as base } from '@playwright/test';
import { withHydration } from '@nxgt/playwright/helpers';

export const test = withHydration(base);
export { expect } from '@playwright/test';
```

```ts
// playwright/e2e/projects.spec.ts
import { expect, test } from '../support/test';

test('opens the filters', async ({ page }) => {
	await page.goto('/projects'); // resolves once the page is hydrated
	await page.getByRole('button', { name: 'Filters' }).click();
	await expect(page.getByRole('dialog')).toBeVisible();
});
```

## Why

A server-rendered control is visible and clickable before the framework's
JavaScript has run. Playwright clicks it, and the click is lost: a checkbox
that never toggles, a menu that never opens, a form posted natively. A slower
project (an emulated phone, a loaded CI runner) hydrates late enough to lose
them. Fills have the same trap, handled by [`fillSettled`](helpers.md#why-a-plain-fill-is-lost).

## The marker

A page is hydrated when its **marker** holds.

```ts
type HydrationMarker = string | (() => unknown);
const DEFAULT_HYDRATION_MARKER = 'html[data-hydrated]';
```

- a string is a CSS selector that must match;
- a function runs in the page and must return something truthy. It is
  serialised into the page, so it may use nothing from the test's scope.

The default marker is an attribute the app sets on `<html>` in an effect of
its root component, which runs only after hydration:

```tsx
// React
import { useEffect } from 'react';

export function Root({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		document.documentElement.dataset.hydrated = '';
	}, []);
	return children;
}
```

```ts
// Vue
import { onMounted } from 'vue';

onMounted(() => {
	document.documentElement.dataset.hydrated = '';
});
```

Another marker, as a selector or a function:

```ts
const test = withHydration(base, { marker: '[data-app-ready]' });
const test = withHydration(base, {
	marker: () => document.documentElement.classList.contains('ready'),
});
```

For a React Router app, [`reactRouterHydrated`](#react-router) needs nothing
from the app.

## `hydrated`

Waits until the marker holds, then two frames, so the effects of that first
render have run.

```ts
type HydrationOptions = {
	marker?: HydrationMarker; // default DEFAULT_HYDRATION_MARKER
	timeout?: number; // default 15_000
};

function hydrated(page: Page, options?: HydrationOptions): Promise<void>;
```

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `marker` | `string \| () => unknown` | `html[data-hydrated]` | What tells the page has hydrated. |
| `timeout` | `number` (ms) | `15_000` | Give up after this long. |

```ts
import { hydrated } from '@nxgt/playwright/helpers';

await page.goto('/projects');
await hydrated(page);
await page.getByRole('button', { name: 'Filters' }).click();
```

When the marker never holds it throws:

```
<url> was not hydrated after 15000ms (marker: html[data-hydrated]). Look for a client error in the console, a module that failed to load, or an app that never sets the marker.
```

The marker reads `a function` when it is one. See
[troubleshooting.md](../troubleshooting.md#url-was-not-hydrated-after-timeoutms-marker-).

## `withHydration`

Returns a `test` whose `page.goto` resolves once the page it opened is
hydrated. It applies to every page of the browser context: the `page`
fixture, `context.newPage()`, and a page object's `goto()` (including
`BasePage`'s).

```ts
function withHydration<T extends PlaywrightTestArgs, W extends object>(
	test: TestType<T, W>,
	options?: HydrationOptions,
): TestType<T & { hydration: HydrationOptions | false }, W>;
```

- A response that is not a document (`/manifest.webmanifest`, JSON, an image)
  is returned without waiting.
- It adds an option fixture, `hydration`: `false` turns the wait off, an
  object changes the marker or the timeout.

```ts
test.describe('static pages', () => {
	test.use({ hydration: false }); // pages that never hydrate
	test('serves the manifest', async ({ page }) => { /* … */ });
});

test.describe('slow page', () => {
	test.use({ hydration: { marker: '[data-app-ready]', timeout: 30_000 } });
});
```

Use `hydration: false` for a block of specs against a page that never sets
the marker: a static page, a production build without the effect.

### Combining with the other fixtures

It takes any `test` whose arguments include Playwright's, so wrap whichever
one you already have:

```ts
// playwright/support/test.ts
import { withLoginFixture } from '@nxgt/playwright/auth';
import { withHydration } from '@nxgt/playwright/helpers';
import { createMswTest } from '@nxgt/playwright/msw';
import { handlers } from '../mocks/handlers';
import { SignInPage } from '../pages/sign-in.page';

export const test = withHydration(withLoginFixture(createMswTest(handlers), SignInPage));
export { expect } from '@playwright/test';
```

See [msw.md](msw.md) and [pages-and-fixtures.md](pages-and-fixtures.md) for
the inner fixtures. Every spec imports `test` and `expect` from this file.

## `hydrationWarnings`

A text rendered from the clock or the locale differs between the server and
the client, and the framework reports a mismatch in the console. Collect them
from now on, then assert there are none:

```ts
function hydrationWarnings(page: Page): string[];
```

```ts
import { expect, test } from '@playwright/test';
import { hydrationWarnings } from '@nxgt/playwright/helpers';

test('projects hydrate cleanly', async ({ page }) => {
	const warnings = hydrationWarnings(page); // before goto
	await page.goto('/projects');
	await page.waitForLoadState('networkidle');
	expect(warnings).toEqual([]);
});
```

It keeps console `error` and `warning` messages, and uncaught page errors,
that match `/hydrat|did(n't| not) match|mismatch/i`. Call it before `goto`;
the array fills as the page reports.

## React Router

`@nxgt/playwright/react-router` is an adapter for a React Router app (framework
or data mode) that renders the whole document. It needs no extra peer.

```ts
import { test as base } from '@playwright/test';
import { withHydration } from '@nxgt/playwright/helpers';
import { reactRouterHydrated } from '@nxgt/playwright/react-router';

export const test = withHydration(base, { marker: reactRouterHydrated });
```

`reactRouterHydrated` is a function marker: it holds once the client router
exists (`window.__reactRouterDataRouter`) and React has attached itself to
`<body>`. The app sets nothing.

### `elementHydrated`

The page's hydration does not cover an element shown later: a dialog's button,
a lazy route's form. A click before React attached its handlers posts a form
natively or does nothing.

```ts
function elementHydrated(locator: Locator, options?: { timeout?: number }): Promise<void>;
```

```ts
import { elementHydrated } from '@nxgt/playwright/react-router';

test('creates a project from the dialog', async ({ page }) => {
	await page.goto('/projects');
	await page.getByRole('button', { name: 'New project' }).click();
	const create = page.getByRole('button', { name: 'Create' });
	await expect(create).toBeVisible();
	await elementHydrated(create);
	await create.click();
});
```

It polls until React attached its props (`__reactProps…`) to the element, and
throws `React never attached its props to this element` when it never does.

Next: [helpers.md](helpers.md) for fills and waits, and
[screens.md](screens.md) for saving what the page looks like.

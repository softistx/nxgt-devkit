# msw

`createMswTest` returns a Playwright `test` whose every page talks to msw
handlers instead of the real API, with default handlers you can replace per
file and extend per test.

```ts
// playwright/config/playwright.setup.ts
import { createMswTest } from '@nxgt/playwright/msw';
import { HttpResponse, http } from 'msw';

export const test = createMswTest([
	http.get('*/api/projects', () => HttpResponse.json([{ id: 1, name: 'Apollo' }])),
]);
export { expect } from '@playwright/test';
```

```ts
// playwright/e2e/projects.spec.ts
import { expect, test } from '../config/playwright.setup';

test('lists projects', async ({ page }) => {
	await page.goto('/projects');
	await expect(page.getByText('Apollo')).toBeVisible();
});
```

Needs `msw` and `@msw/playwright` next to `@playwright/test`:

```bash
bun add -d msw @msw/playwright
```

The interception happens at the browser context, through `@msw/playwright`:
nothing is installed in the app, there is no service worker to register, and
requests the page makes (`fetch`, XHR) that a handler matches are answered by
it. Requests your **server** makes during SSR do not go
through the browser and are not intercepted.

## Signature

```ts
import type { NetworkFixture } from '@msw/playwright';
import type { AnyHandler } from 'msw';

type MswFixtures = {
	handlers: AnyHandler[]; // an option: override with test.use({ handlers })
	network: NetworkFixture; // auto: enabled for every test
};

type MswTestOptions = {
	onReset?: () => unknown;
};

function createMswTest(
	handlers: AnyHandler[],
	options?: MswTestOptions,
): TestType<PlaywrightTestArgs & PlaywrightTestOptions & MswFixtures, PlaywrightWorkerArgs & PlaywrightWorkerOptions>;
```

For each test, in this order: `onReset()` runs, the network fixture is created
for the test's browser context with the current `handlers`, it is enabled, the
test runs, it is disabled. `network` is an automatic fixture — a test gets the
mocks without asking for it.

## Options

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `onReset` | `() => unknown` (may return a promise) | none | Awaited before the network is enabled, for each test. |

### `onReset`: mock data that tests write to

Handlers run in the Playwright worker — the Node process running the spec,
not the browser. Mock data they read and write lives there too, so a `POST` in
one test is still there in the next test of the same worker. Reseed it in
`onReset`:

```ts
// playwright/config/playwright.setup.ts
import { createMswTest } from '@nxgt/playwright/msw';
import { HttpResponse, http } from 'msw';

type Project = { id: number; name: string };
const seed = (): Project[] => [{ id: 1, name: 'Apollo' }];
let projects = seed();

export const handlers = [
	http.get('*/api/projects', () => HttpResponse.json(projects)),
	http.post('*/api/projects', async ({ request }) => {
		const { name } = (await request.json()) as { name: string };
		const project = { id: projects.length + 1, name };
		projects = [...projects, project];
		return HttpResponse.json(project, { status: 201 });
	}),
];

export const test = createMswTest(handlers, {
	onReset: () => {
		projects = seed();
	},
});
export { expect } from '@playwright/test';
```

## The `handlers` fixture: per file or per block

`handlers` is a Playwright option fixture: `test.use({ handlers })` **replaces**
the defaults for the file or `describe` block it is in.

```ts
import { HttpResponse, http } from 'msw';
import { expect, test } from '../config/playwright.setup';

test.describe('no projects', () => {
	test.use({
		handlers: [http.get('*/api/projects', () => HttpResponse.json([]))],
	});

	test('shows the empty state', async ({ page }) => {
		await page.goto('/projects');
		await expect(page.getByTestId('empty')).toBeVisible();
	});
});
```

To keep the defaults and change one route, put the override first — msw uses
the first handler that matches:

```ts
import { HttpResponse, http } from 'msw';
import { handlers, test } from '../config/playwright.setup';

test.use({
	handlers: [
		http.get('*/api/projects', () => new HttpResponse(null, { status: 503 })),
		...handlers,
	],
});
```

## The `network` fixture: for one test

`network.use(...)` adds handlers mid-test. They take precedence over
`handlers` and are dropped when the test ends.

```ts
import { HttpResponse, http } from 'msw';
import { expect, test } from '../config/playwright.setup';

test('shows a server error', async ({ page, network }) => {
	network.use(
		http.get('*/api/projects', () => new HttpResponse(null, { status: 500 })),
	);
	await page.goto('/projects');
	await expect(page.getByRole('alert')).toBeVisible();
});
```

`network` is `@msw/playwright`'s `NetworkFixture`; see its documentation for
the rest of its methods.

## Sharing handlers with the app

Most apps already have msw handlers for development or unit tests. Import the
same array:

```ts
// playwright/config/playwright.setup.ts
import { createMswTest } from '@nxgt/playwright/msw';
import { resetMockDb } from '../../src/mocks/db';
import { handlers } from '../../src/mocks/handlers';

export const test = createMswTest(handlers, { onReset: resetMockDb });
export { expect } from '@playwright/test';
```

To add a `login` fixture or sign-in on top, wrap the result — see
[pages-and-fixtures.md](pages-and-fixtures.md#putting-it-together).

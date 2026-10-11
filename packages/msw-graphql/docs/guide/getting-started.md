# Getting started

Two complete setups, to copy and adapt: an SPA that mocks in the browser, and
an SSR/BFF app that mocks in its server process and is steered by Playwright.
Both share one `mocks/` folder: the schema, the executor and the handlers.

```bash
bun add -d @nxgt/msw-graphql msw graphql @graphql-tools/schema @graphql-tools/mock
```

## The shared part

```ts
// mocks/schema.ts
import { buildMockSchema } from '@nxgt/msw-graphql/schema';
import { loadSdl } from '@nxgt/msw-graphql/sdl';

const typeDefs = await loadSdl({
	vite: () => import('~/graphql/schema.graphql?raw'),
	file: new URL('../graphql/schema.graphql', import.meta.url),
});

export const schema = buildMockSchema({
	typeDefs,
	mocks: { Date: () => '2020-01-01' },
});
```

```ts
// mocks/handlers.ts
import { bearerToken, createExecutor, graphqlEndpoint } from '@nxgt/msw-graphql';
import { schema } from './schema';

const execute = createExecutor({
	schema,
	context: (request) => ({ token: bearerToken(request) }),
});

export const handlers = [graphqlEndpoint('https://api.example.com/graphql', execute)];
```

`graphqlEndpoint` is one catch-all `POST` handler: no per-operation handler to
write or generate. See [executor](executor.md) and [schema](schema.md).

## Setup A: an SPA

```bash
bunx msw init public/ --save    # the worker script, once
```

```ts
// src/main.tsx
// import.meta.env.DEV is `false` in a production build: Vite removes the
// branch and its imports, so no msw or handlers chunk is emitted.
if (import.meta.env.DEV && import.meta.env.VITE_MOCKS === 'true') {
	const { enableMocking } = await import('@nxgt/msw-graphql/browser');
	await enableMocking({
		enabled: true,
		handlers: () => import('../mocks/handlers'),
	});
}

await import('./render'); // mounts the app
```

`enableMocking` resolves to the worker, or `null` when `enabled` is false;
then neither `msw/browser` nor the handlers are loaded at run time. Keeping
them out of the production bundle is the `import.meta.env.DEV` condition's job:
a dynamic `import()` behind a runtime flag alone still emits the chunk (see
[Production](./control.md#production)). The handlers module may export the array as
`handlers`, as `default`, or be the array itself.

To drive the mocks from Playwright in a browser, use the `/msw` subpath of
`@nxgt/playwright` (it runs the handlers in the page); the control below is
for mocks that live in a server.

## Setup B: an SSR/BFF app

The loaders call the API from the server, so the mocks live in the server.

When your API client takes a `fetch`, use `createMockFetch`: it answers
through the handlers with no global patch, on Node or Bun, msw 2 or 3 (see
[runtimes](runtimes.md#node-and-bun)).

```ts
// server.ts
import { Hono } from 'hono';

const app = new Hono();
let apiFetch: typeof fetch = fetch; // hand this to your API client

if (process.env.MOCKS === 'true') {
	const { handlers } = await import('./mocks/handlers');
	const { createMockFetch } = await import('@nxgt/msw-graphql/fetch');

	const mock = createMockFetch(handlers, {
		reset: () => resetMocks(),
		scenarios: {
			empty: () => emptyMocks(),
			remove: ({ id }: { id: string }) => removeRecord(id),
		},
	});
	apiFetch = mock.fetch;
	const { control } = mock;

	app.all('/__mocks/*', async ({ req }) => (await control.handle(req.raw)) ?? new Response(null, { status: 404 }));
}
```

For a client that cannot take a `fetch`, replace the `createMockFetch` lines
with `startMockServer` from `@nxgt/msw-graphql/node`, which patches the process
(Node, or Bun on msw 2 only) and returns the same `control`:

```ts
const { startMockServer } = await import('@nxgt/msw-graphql/node');
const { control } = startMockServer(handlers, { reset: () => resetMocks() });
```

`startMockServer` is idempotent per process: a second call (an SSR entry
module re-evaluated by Vite's HMR, say) returns the first call's
`{ server, control }` and starts nothing, so listeners do not stack. The
second call's `handlers` and options are ignored; to change them, use
`server.use(...)` or `control.reset()` on the running server, or
`server.close()`, after which the next call starts a new one.

`close()` is the supported way to stop the server. Calling `listen()` again on
a closed server restarts its interception but does not register it again, so
the next `startMockServer` starts another server rather than returning that
one: close, then call `startMockServer` again. A call that finds a registered
server returns it before anything else, so it does not throw under
`NODE_ENV=production`; the production guard ran when that server was built.

Then Playwright, with `@nxgt/playwright/mock-server` (it needs only
`@playwright/test`):

```ts
// playwright/fixtures.ts
import { test as base } from '@playwright/test';
import { createMockServerTest } from '@nxgt/playwright/mock-server';

export const test = createMockServerTest(base); // path defaults to /__mocks
```

```ts
// playwright/e2e/students.spec.ts
import { expect } from '@playwright/test';
import { test } from '../fixtures';

test('an API outage shows the error page', async ({ page, mockServer }) => {
	await mockServer.fail(503);
	await page.goto('/students');
	await expect(page.getByRole('alert')).toBeVisible();
});

test('a removed student leaves the list', async ({ page, mockServer }) => {
	await mockServer.scenario('remove', { id: '1' });
	await page.goto('/students');
});

test.describe('forbidden', () => {
	test.use({
		serverMocks: [{
			operationName: 'GetStudents',
			status: 403,
			errors: [{ message: 'forbidden', extensions: { http: { status: 403 } } }],
		}],
	});
	test('shows the forbidden page', async ({ page }) => {
		await page.goto('/students');
	});
});
```

The fixture resets the mocks before each test (then applies `serverMocks`) and
after it, also when the test's setup failed. Server mocks are process-global,
so run these projects with `workers: 1` and `fullyParallel: false`; parallel
runs need one server (and port) per worker.

Next: [control](control.md) for every route, [runtimes](runtimes.md) before
choosing msw 2 or 3.

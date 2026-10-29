# Mock server

`createMockServerTest` extends a Playwright `test` with a `mockServer`
fixture that drives the mocks of an SSR/BFF app **from the test**: when the
app's own server calls the API (not the browser), msw in the browser cannot
see it, so the mocks live in the server process and the spec talks to them
over HTTP.

```ts
// playwright/config/playwright.setup.ts
import { test as base } from '@playwright/test';
import { createMockServerTest } from '@nxgt/playwright/mock-server';

export const test = createMockServerTest(base);
export { expect } from '@playwright/test';
```

```ts
// playwright/e2e/students.spec.ts
import { expect, test } from '../config/playwright.setup';

test('shows the error page when the API is down', async ({ page, mockServer }) => {
	await mockServer.fail(503);
	await page.goto('/students');
	await expect(page.getByRole('alert')).toBeVisible();
});
```

Only `@playwright/test` is needed: the subpath imports neither `msw` nor
`@nxgt/msw-graphql`. It talks to a **control** the app mounts, a route that
answers `POST <path>/reset|fail|scenario|override`. `@nxgt/msw-graphql`'s
`createMockControl` (or `startMockServer`, which returns one) is that control;
any app that mounts the same four routes works. The requests go through the
`request` fixture, so the `baseURL` of the project must be the app's.

## The fixture

```ts
type MockServer = {
	/** The app's reseed, handlers back to default, no forced failure. */
	reset(): Promise<void>;
	/** Every API call answers this status until `fail(null)` or a reset. */
	fail(status: number | null): Promise<void>;
	/** Runs a scenario the app registered, by name, with JSON arguments. */
	scenario(name: string, args?: unknown): Promise<void>;
	/** Static answers for operations, until the next reset. */
	use(...overrides: ServerOverride[]): Promise<void>;
};

type ServerOverride = {
	operationName: string;
	status?: number;
	data?: unknown;
	errors?: unknown[];
	once?: boolean;
};

function createMockServerTest<T extends PlaywrightTestArgs & PlaywrightTestOptions>(
	base: TestType<T, PlaywrightWorkerArgs & PlaywrightWorkerOptions>,
	options?: { path?: string },
): TestType<T & { mockServer: MockServer; serverMocks: ServerOverride[] }, …>;
```

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `path` (of `createMockServerTest`) | `string` | `/__mocks` | Where the app mounts the control. A trailing `/` is dropped. |
| `scope` (of `createMockServerTest`) | `boolean` | `false` | Send `x-mock-scope: <workerIndex>` so workers do not share mocks, see [below](#parallel-workers-the-scope-option). |
| `serverMocks` (a test option) | `ServerOverride[]` | `[]` | Overrides applied before each test, see below. |

`mockServer` is an automatic fixture: every test of the extended `test` gets
the reset below, whether it asks for `mockServer` or not.

For each test, in this order: `reset()`, then `use(...serverMocks)` when the
list is not empty, the test, then `reset()` again. The last reset runs even
when the setup or the test failed, so one test's mocks never reach the next.

| Method | What the server does |
| --- | --- |
| `reset()` | Clears the forced failure and the overrides, restores the default handlers, then runs the app's own `reset` (reseeding its data). |
| `fail(status)` | Every API call answers `status` (a 503 has an empty body) until `fail(null)` or a reset. |
| `scenario(name, args?)` | Runs the scenario the app registered under `name`, with `args` (any JSON). |
| `use(...overrides)` | Static answers for the named operations, until the next reset. |

```ts
await mockServer.fail(503);
await mockServer.fail(null);                 // the API is back
await mockServer.scenario('empty');          // no arguments
await mockServer.scenario('remove', { id: 7 });
await mockServer.use({ operationName: 'GetStudents', data: { students: [] } });
```

## `serverMocks`: the same overrides for a file or a block

`serverMocks` is an option fixture, like [`handlers`](msw.md#the-handlers-fixture-per-file-or-per-block):
`test.use({ serverMocks })` sets the overrides for the file or `describe`
block, applied before each of its tests and cleared after.

```ts
import { expect, test } from '../config/playwright.setup';

test.describe('forbidden', () => {
	test.use({
		serverMocks: [
			{
				operationName: 'GetStudents',
				status: 403,
				errors: [{ message: 'forbidden', extensions: { http: { status: 403 } } }],
			},
		],
	});

	test('shows the forbidden page', async ({ page }) => {
		await page.goto('/students');
		await expect(page.getByText('Forbidden')).toBeVisible();
	});
});
```

An override carries `operationName` (required), and optionally `status`,
`data`, `errors` (the GraphQL response body) and `once: true` to answer the
operation a single time. `test.use({ serverMocks })` **replaces** the list
of the enclosing scope; for one test, call `mockServer.use(...)` instead.

## Scenarios, with arguments

A scenario is a named action the app registered in its server
(`scenarios: { remove: ({ id }) => removeRecord(id) }`): it changes the
server's data the way no static override can. The test names it and passes
JSON.

```ts
test('removes a student', async ({ page, mockServer }) => {
	await mockServer.scenario('remove', { id: 7 });
	await page.goto('/students');
	await expect(page.getByText('Ada')).toHaveCount(0);
});
```

An unknown name is a 404 that lists the registered scenarios, thrown by the
fixture as the error below.

## Composing with `createMswTest`

The two fixtures answer different callers: `createMswTest` mocks what the
**browser** requests, `createMockServerTest` mocks what the app's **server**
requests. An app can need both; chain them, either order:

```ts
import { test as base } from '@playwright/test';
import { createMockServerTest } from '@nxgt/playwright/mock-server';
import { createMswTest } from '@nxgt/playwright/msw';
import { handlers } from '../../src/mocks/handlers';

export const test = createMockServerTest(createMswTest(handlers));
export { expect } from '@playwright/test';
```

The result has `handlers`, `network`, `mockServer` and `serverMocks`. See
[msw.md](msw.md) for the first two.

## The control's route contract

The fixture only does `POST <path>/<route>` with a JSON body through the
`request` fixture:

| Call | Route | Body |
| --- | --- | --- |
| `reset()` | `<path>/reset` | `{}` |
| `fail(status)` | `<path>/fail` | `{ "status": 503 }` or `{ "status": null }` |
| `scenario(name, args)` | `<path>/scenario` | `{ "name": "remove", "args": { "id": 7 } }` |
| `use(...overrides)` | `<path>/override` | the array of overrides |

Any other status than 2xx is thrown as:

```
<path>/<route> answered <status>: <body>. Is the control mounted (createMockControl().handle) and NODE_ENV not production?
```

For example, `mockServer.scenario('nope')` rejects with `/__mocks/scenario answered 404: …`
followed by the control's body, which says no such scenario is registered.
See [troubleshooting](../troubleshooting.md#mock-server). Mounting the
control on the app side, in Hono, Elysia or a plain fetch handler, is
`@nxgt/msw-graphql`'s `createMockControl`; the control answers 404 in production
(`NODE_ENV=production` or `import.meta.env.PROD`), so a production build never obeys a spec.

## Parallel workers: the `scope` option

```ts
export const test = createMockServerTest(base, { scope: true });
```

With `scope: true`, the fixture sends `x-mock-scope: <workerIndex>` on its
control calls (`reset`, `fail`, `scenario`, `override`) and, through
`extraHTTPHeaders`, on every request of the `page` and the `request` fixture.
Each worker then has its own forced failure, overrides and streams on the
server, and one worker's reset leaves the others untouched. Other
`extraHTTPHeaders` of the project are kept. Off by default: without it nothing is
sent and the mocks stay process-global.

The server must cooperate. With `@nxgt/msw-graphql`, `control.handle` reads the
header, and the app forwards the scope from its incoming request to its API
calls with `withScope(scopeOf(request), …)`; its `reset` and scenarios receive
`{ scope }` to reseed per scope. See
the ["Mock scopes" section](https://github.com/softistx/nxgt-devkit/blob/develop/packages/msw-graphql/docs/guide/control.md#mock-scopes) of `@nxgt/msw-graphql`'s control guide. An app
that mounts the same four routes by hand must read the header itself.

Two cautions. `extraHTTPHeaders` reaches **every** request of the page,
cross-origin ones included, and a custom header makes those preflighted: if a
third-party origin refuses it, keep `scope` off for that project. And the scope
is the worker index, so tests of one worker still run one after another against
their scope: this isolates workers, not the tests of one worker.

## One worker: `workers: 1`

Without `scope: true`:

The mocks live in **one** server process and are global to it. Two tests
running at once against the same server change each other's mocks (one
test's `fail(503)` fails the other's page). So a project whose specs use
`mockServer` or `serverMocks` runs with one worker and no parallel files:

```ts
// playwright.config.ts
import { defineAppConfig } from '@nxgt/playwright/config';

export default defineAppConfig({
	port: 5174,
	overrides: {
		workers: 1,
		fullyParallel: false,
	},
});
```

Measured in this repository: the contract spec run in parallel with the other
specs against one server failed 11 of 18; with `workers: 1` it passes, which is
why it has a config of its own.

To keep parallelism, use the `scope` option above, or give each worker its own server on its own port
(one `webServer` per port, and a `baseURL` chosen from
`testInfo.parallelIndex` in a worker-scoped fixture) so no two tests share a
process. Only the one-worker rule is covered by this package's tests.

## The duplicated wire types, and the contract spec

`MockServer` and `ServerOverride` are copied from `@nxgt/msw-graphql/control`
on purpose: this subpath talks HTTP and imports neither msw nor that package,
so an app that mocks its API some other way can still use it. To keep the
copies from drifting, `test/e2e/mock-server.pw.ts` in the repository imports
both packages, mounts the real control and drives it through the fixture, and
asserts at type level that the two `Override` types are identical. If you
fork either side, keep that spec.

## Related

- [msw.md](msw.md): mocks that live in the browser's network.
- [troubleshooting](../troubleshooting.md#mock-server): the errors above.

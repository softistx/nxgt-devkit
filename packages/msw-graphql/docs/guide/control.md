# The control channel

The control lets a test change the mocks while the app runs: reset them, make
the API fail, run a named scenario (reseed the app), or answer one operation
with a fixed result. It is a set of methods, and the same methods over HTTP.

It is for development and tests only: `createMockControl` and `startMockServer`
throw under `NODE_ENV=production` and in a Vite production build (`import.meta.env.PROD`).

```ts
import { createMockControl } from '@nxgt/msw-graphql/control';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

const server = setupServer(...handlers);
const control = createMockControl({
	server,
	reset: () => resetMocks(),
	scenarios: { empty: () => emptyMocks() },
});
```

`startMockServer(handlers, options)` from `@nxgt/msw-graphql/node` does the
`setupServer`, the `createMockControl` and `server.listen()` in one call and
returns `{ server, control }`. It is idempotent per process: a second call
returns the running pair and ignores its arguments (see
[getting started](./getting-started.md)).

`createMockFetch` from `@nxgt/msw-graphql/fetch` returns the same `control`
(`fail`, `reset`, `scenario`, `override`, `handle`) with the same options and
behaviour; only the server differs. See [fetch](fetch.md).

## Options

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `server` | `{ use, resetHandlers }` | required | An msw Node server or browser worker. Not an option of `startMockServer`, which makes it |
| `reset` | `() => unknown` | none | The app's reseed. `control.reset()` calls it; nothing else does |
| `scenarios` | `Record<string, (args?) => unknown>` | `{}` | Named app states, run by name with JSON arguments |
| `path` | `string` | `'/__mocks'` | Where the HTTP routes are mounted |
| `state` | `MockState` | `mockState` | The state shared with the executor: pass the same one to both, or neither |

`createMockFetch` takes these options (without `server`) too.
`startMockServer` adds `onUnhandledRequest` (`'bypass'` default, `'warn'`,
`'error'`).

## The methods

```ts
control.fail(503);                       // every call answers 503, no body
control.fail(null);                      // back to normal
control.failing;                         // number | null
await control.scenario('remove', { id: '1' });
control.override({ operationName: 'GetStudents', data: { students: [] } });
await control.reset();
```

| Method | Effect |
| --- | --- |
| `reset()` | `failing = null`, ends live SSE streams, `server.resetHandlers()` (drops overrides), then your `reset`. Nothing else: sessions, say, are the app's business |
| `fail(status \| null)` | While set, the executor answers that status first ([order](executor.md#the-order)) |
| `scenario(name, args?)` | Runs `scenarios[name](args)`. Throws `UnknownScenarioError` (`No scenario "x". Registered: empty, remove.`) for an unregistered name |
| `override(...overrides)` | A static answer per operation, until the next reset. Throws `TypeError` for an invalid one |
| `handle(request)` | The HTTP face, below |

### Overrides

```ts
type Override = {
	operationName: string;
	status?: number;     // default: the first error's extensions.http.status, else 200
	data?: unknown;
	errors?: unknown[];
	once?: boolean;      // answer once, then fall back to the executor
};
```

```ts
control.override(
	{ operationName: 'GetStudents', data: { students: [] } },
	{
		operationName: 'RemoveStudent',
		once: true,
		errors: [{ message: 'forbidden', extensions: { http: { status: 403 } } }],
	},
);
```

An override answers before the executor, so it also bypasses `guard`.

An override matches a POST by the `operationName` in the body, or, without one,
by the name of the query's only operation (a document with several operations
and none selected matches nothing). It stands aside while the API is failing. Later overrides
are consulted first.

## Mock scopes

The mocks are process-global, so two Playwright workers sharing one app server
reset each other's overrides and forced failures. A **scope** keeps them apart:
a short token (1-64 characters of letters, digits and `_ . : -`, in practice a
worker index) under which the control keeps its own forced failure, overrides
and event streams. Off by default; nothing changes until a call carries a scope.

```ts
const mine = control.scope('1');   // the same methods, acting on scope "1" only
mine.fail(503);                    // only calls of scope "1" answer 503
mine.override({ operationName: 'GetStudents', data: { students: [] } });
await mine.scenario('remove', { id: '1' });
await mine.reset();                // scope "1" only; the others are untouched
mine.failing;                      // number | null
```

`control.scope(id)` returns `reset`, `fail`, `scenario`, `override` and
`failing` (type `MockControlMethods`) and throws a `TypeError` for an invalid
id. A scoped reset clears that scope's failure, overrides and streams, then
calls your `reset` with `{ scope }`; a scoped scenario is called with
`(args, { scope })`. Unscoped calls pass no extra argument, as before. Your
reseed must key its data by `context.scope` for the scopes to be independent;
the control cannot know your data. An unscoped `reset()` clears every scope. A
global `fail()` still reaches every scope.

**Which scope does an API call have?** The executor and the override handlers
take it from `withScope`, else from an `x-mock-scope` header on the API request
itself. The app's server receives the header on the browser's request, so it
forwards it once, around the code that makes its API calls:

```ts
import { scopeOf, withScope } from '@nxgt/msw-graphql';

export async function fetch(request: Request) {
	const response = await control.handle(request); // scoped by the header
	if (response) return response;
	return withScope(scopeOf(request), () => app.fetch(request));
}
```

| Export | Effect |
| --- | --- |
| `scopeOf(request)` | The valid `x-mock-scope` of a request, else `undefined` |
| `withScope(scope, fn)` | Runs `fn` with `scope` current, across awaits (an `AsyncLocalStorage`); `undefined` runs `fn` as is. Without `AsyncLocalStorage` (a browser) it just runs `fn` |
| `currentScope()` | The scope `withScope` set, if any |
| `SCOPE_HEADER` | `'x-mock-scope'` |
| `scoped(make)` | A mutable object with one instance per scope, used as the object itself |
| `scopedValue(initial)` | `{ get, set }`: a value with one slot per scope |
| `scopedCounter()` | `{ next, reset }`: a count per scope |

Two rules follow from this. `withScope(undefined, fn)` inside an outer
`withScope` keeps the outer scope; it never clears it. And the scope `withScope`
set wins over an `x-mock-scope` header on the API request itself.

**Reset through the control.** A scope's override handler is registered with the
server once. If your app calls `server.resetHandlers()` itself, outside the
control's `reset`, that handler is dropped and the scope's overrides stop
answering; reset through `control.reset()` or `control.scope(id).reset()`.

`@nxgt/playwright`'s `createMockServerTest(base, { scope: true })` sends the
header with the worker index; see its
[mock-server guide](../../../playwright/docs/guide/mock-server.md#parallel-workers-the-scope-option).


### Per-scope mock data

The control keeps its failure, overrides and streams per scope, but your mock
data is yours, and it must be split too, or the workers still share it.
`scoped`, `scopedValue` and `scopedCounter` hold state once per scope, keyed by
`currentScope()` (the default scope, no `withScope` and no header, is `""`):

```ts
import { scoped, scopedCounter, scopedValue } from '@nxgt/msw-graphql';

// A mutable object, one instance per scope, used exactly as the object itself.
const students = scoped(() => new Map<string, { name: string }>());
students.set('1', { name: 'Ada' }); // only the current scope's map changes

// A scalar or a reassigned array, one slot per scope.
const draft = scopedValue<string[]>(() => []);
draft.set([...draft.get(), 'x']);

// A counter, one count per scope.
const ids = scopedCounter();
ids.next();  // 1, then 2, ...
ids.reset(); // back to 0 for the current scope only
```

Instances are created lazily by the function you give, the first time a scope
touches them. In a `reset` or scenario callback, wrap the work in
`withScope(context?.scope, () => students.clear())` to empty one scope's map.

## Over HTTP

`control.handle(request)` is a Fetch API handler: `Request -> Promise<Response | null>`.
It returns `null` when the path is not the control's, so it composes with any
framework. Mount it anywhere that can hand it the raw `Request`:

```ts
// Hono
app.all('/__mocks/*', async ({ req }) => (await control.handle(req.raw)) ?? new Response(null, { status: 404 }));
```

```ts
// a plain fetch handler (Bun.serve, a Worker-style entry, a React Router server)
export async function fetch(request: Request) {
	const response = await control.handle(request);
	if (response) return response;
	return app.fetch(request);
}
```

Elysia hands the Request as `request`: `app.all('/__mocks/*', async ({ request }) => (await control.handle(request)) ?? new Response(null, { status: 404 }))`.
A custom `path` must match the mount and the client's.

### Routes

All are `POST <path>/<route>` with `Content-Type: application/json`, even when the body is empty (`reset`
sends `{}`). Any other POST is a `415`. An `x-mock-scope` header scopes the call
([mock scopes](#mock-scopes)); an invalid one is a `400`, never a global call.

| Route | Body | Effect |
| --- | --- | --- |
| `reset` | none | `control.reset()` |
| `fail` | `{ "status": 503 }` or `{ "status": null }` | `control.fail(status)` |
| `scenario` | `{ "name": "remove", "args": { "id": "1" } }` | `control.scenario(name, args)`; `args` is any JSON |
| `override` | one override object, or an array | `control.override(...)` |

The routes are fixed. An app's own control routes (`/__mocks/empty`,
`/__mocks/remove?id=…`) become scenarios: register `scenarios: { empty, remove }`
and post `{ "name": "remove", "args": { "id": "1" } }` to `scenario`.

```bash
curl -X POST localhost:3000/__mocks/fail -H 'content-type: application/json' -d '{"status":503}'
```

### Statuses

Success is `200` with `{ "ok": true }`.

| Status | When |
| --- | --- |
| `null` result (your app answers) | The path is not `<path>` or `<path>/...` |
| `404` | Unknown route, **and every route in production** (`NODE_ENV=production` or `import.meta.env.PROD`) (empty body) |
| `404` with `{ error }` | Unknown scenario; the message lists the registered names |
| `405` with `allow: POST` | A method other than POST |
| `415` | A POST without `Content-Type: application/json`, an empty body included. A cross-site page cannot send that without a preflight the app never grants, which is the protection against another tab driving your mocks |
| `400` | Bad JSON; `fail` status not an integer 100-599 or null; `scenario` without a string `name`; an invalid override (`operationName` missing, `status` out of range, `errors` not an array, `once` not a boolean) |
| `500` with `{ error }` | Your `reset` or a scenario threw; `error` is its message |

Errors carry `{ "error": "<message>" }`.

## From Playwright

`@nxgt/playwright/mock-server` is the typed client of these routes; see
[getting started](getting-started.md#setup-b-an-ssrbff-app). Its error names
the route, the status and the body, and reminds you the control must be mounted
and `NODE_ENV` not production.

## Unit tests without HTTP

Call the executor and the control directly; there is no server to start:

```ts
import { beforeEach, expect, test } from 'bun:test';
import { createExecutor, createMockState } from '@nxgt/msw-graphql';
import { createMockControl } from '@nxgt/msw-graphql/control';

const state = createMockState();
const execute = createExecutor({ schema, state });
const control = createMockControl({
	server: { use() {}, resetHandlers() {} }, // enough for fail/reset
	state,
});

beforeEach(() => control.reset());

test('an outage answers 503', async () => {
	control.fail(503);
	const response = await execute({
		query: '{ students { id } }',
		request: new Request('http://api.test/graphql', { method: 'POST' }),
	});
	expect(response.status).toBe(503);
});

test('the HTTP face, with a hand-made Request', async () => {
	const response = await control.handle(
		new Request('http://app.test/__mocks/fail', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ status: 502 }),
		}),
	);
	expect(response?.status).toBe(200);
	expect(control.failing).toBe(502);
});
```

`override` needs a real msw `server` (or worker) to register its handler with.
Own the state, not the process-global one, so tests do not leak into each other.

## Production

The real protection is importing `@nxgt/msw-graphql/control` and `/node` only
behind the mocks flag. The guard is a backstop: creating the control throws
when `NODE_ENV=production` (Node) or in a Vite production build
(`import.meta.env.PROD`):

```
createMockControl is dev and test only: NODE_ENV is "production". ...
```

`startMockServer` builds the control before it listens, so no server is left
running. The guard fails open when `NODE_ENV` is unset, which is the case under
Bun: do not rely on it there.

A dynamic `import()` alone does not keep the code out of a client build: Vite
still emits the chunk (it is just not loaded) unless the condition is
statically false. Use something Vite replaces at build time:

```ts
// import.meta.env.DEV is `false` in a production build, so the branch and
// its import are removed and no chunk is emitted.
if (import.meta.env.DEV && import.meta.env.VITE_MOCKS === 'true') {
  const { enableMocking } = await import('@nxgt/msw-graphql/browser');
  // ...
}
```

or a constant from `define` in `vite.config.ts` (`__MOCKS__: JSON.stringify(mode !== 'production')`)
tested as `if (__MOCKS__) { ... }`. On a server, `process.env.MOCKS === 'true'`
with a dynamic import is enough, since nothing is bundled for the client.

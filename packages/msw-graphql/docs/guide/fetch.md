# createMockFetch

A `fetch` answered by your handlers, with no global patch: for an SSR/BFF app
whose API client takes an injected `fetch`. It works on msw 2 and 3, under Node and
under Bun, and patches nothing, so it also fits where a global patch is unwanted.
(Before 0.3.0 it was the only way to mock the API under Bun with msw 3, where a
plain `setupServer` does not intercept Bun's native `fetch`,
[mswjs/msw#2811](https://github.com/mswjs/msw/issues/2811); `startMockServer`
now covers that case for `fetch` clients.)

```ts
import { createMockFetch } from '@nxgt/msw-graphql/fetch';
import { handlers } from './mocks/handlers';

const { fetch, control, server } = createMockFetch(handlers);

const response = await fetch('https://api.example.com/graphql', {
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify({ query: '{ students { id } }' }),
});
```

`globalThis.fetch` is untouched. Hand `fetch` to the API client; use
`startMockServer` ([control](control.md)) only for a client that cannot take one.

## Signature

```ts
function createMockFetch(
	handlers: readonly unknown[],
	options?: CreateMockFetchOptions,
): { fetch: typeof fetch; control: MockControl; server: { use; resetHandlers; listHandlers } };

type CreateMockFetchOptions = Omit<MockControlOptions, 'server'> & {
	strict?: boolean;
	fallback?: typeof fetch;
};
```

## Options

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `reset` | `() => unknown` | none | The app's reseed, run by `control.reset()` |
| `scenarios` | `Record<string, (args?) => unknown>` | `{}` | Named app states |
| `path` | `string` | `'/__mocks'` | Where the control's HTTP routes are mounted |
| `state` | `MockState` | `mockState` | The state shared with the executor: pass the same one to both, or neither |
| `strict` | `boolean` | `false` | Throw `createMockFetch: no handler for GET <url>.` on a request no handler matches (a handler's `passthrough()` is not an unhandled request) |
| `fallback` | `typeof fetch` | the global `fetch` | Where an unhandled request goes |

```ts
const { fetch } = createMockFetch(handlers, {
	strict: true, // a request outside the handlers fails the test
});
```

## The return value

- `fetch`: accepts a URL, a string or a `Request`, like the real one.
- `control`: the same channel as `startMockServer`'s (`fail`, `reset`,
  `scenario`, `override`, `handle`), documented in [control](control.md). Its
  overrides go in front of the handlers until the next reset.
- `server`, a small subset of msw's server, typed loosely because msw 2 and 3
  name their handler types differently: `use(...handlers)` puts handlers in front, `resetHandlers()`
  restores the initial ones, `listHandlers()` returns the current ones.

```ts
import { HttpResponse, http } from 'msw';

server.use(http.post('https://api.example.com/graphql', () => HttpResponse.json({ data: { whoami: 'used' } })));
server.resetHandlers();
```

## `bypass()` and `passthrough()`

Both are msw's own helpers, and `createMockFetch` honours them (since 0.3.0).

**`bypass(request)`** in a resolver sends that request to the real server, to
build a response from the real one. msw marks the request with
`accept: msw/passthrough`; `createMockFetch` recognises the marker, skips the
handlers (so the resolver is not entered again) and strips the marker before
the request goes to `fallback`, or to the real `fetch` when there is none. Call
the **mock's** `fetch` in the resolver: a plain unpatched `fetch` would send the
marker to the server. A `strict` mock does not throw for it.

```ts
import { bypass, HttpResponse, http } from 'msw';

const url = 'https://api.example.com/profile';
let mock: ReturnType<typeof createMockFetch>;
mock = createMockFetch([
	http.get(url, async ({ request }) => {
		const real = await mock.fetch(bypass(request)); // reaches the real server
		return HttpResponse.json({ ...(await real.json()), patched: true });
	}),
]);
```

**`passthrough()`** answers "not mine, send it for real". Before 0.3.0
`createMockFetch` returned msw's `302` response to the caller; now the request
goes to `fallback` (or the real `fetch`), as msw does. It is not an unhandled
request, so `strict: true` does not throw for it:

```ts
const { fetch } = createMockFetch(
	[http.get('https://cdn.example.test/*', () => passthrough())],
	{ strict: true, fallback: realFetch },
);
await fetch('https://cdn.example.test/logo.png'); // answered by realFetch
```

What the real `fetch` receives (a `Request` plus the init's extra options) is
described in [runtimes](runtimes.md#bypass-and-passthrough).

## In an SSR app

```ts
import { createMockFetch } from '@nxgt/msw-graphql/fetch';
import { Hono } from 'hono';
import { handlers } from './mocks/handlers';

const app = new Hono();
const mock = createMockFetch(handlers, { reset: () => resetMocks() });

app.all('/__mocks/*', async ({ req }) => (await mock.control.handle(req.raw)) ?? new Response(null, { status: 404 }));

const client = createClient({ url: 'https://api.example.com/graphql', fetch: mock.fetch }); // your API client
```

Import it behind your mocks flag: it builds the control, which throws under
`NODE_ENV=production` (see [control](control.md#production)).

An aborted `signal` rejects the call, as with the real `fetch`, whether a
handler answers it or not.

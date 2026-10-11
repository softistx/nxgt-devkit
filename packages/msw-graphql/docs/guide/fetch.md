# createMockFetch

A `fetch` answered by your handlers, with no global patch: for an SSR/BFF app
whose API client takes an injected `fetch`. It is the way to mock the API on
Bun with msw 3, where `startMockServer` does not intercept Bun's native `fetch`
([mswjs/msw#2811](https://github.com/mswjs/msw/issues/2811)). It works on
msw 2 and 3, under Node and under Bun.

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
| `strict` | `boolean` | `false` | Throw `createMockFetch: no handler for GET <url>.` on a request no handler matches |
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

# @nxgt/msw-graphql

Mock a GraphQL API with [msw](https://mswjs.io) by executing the real
operations against your schema: the operation is parsed, validated and run
against resolvers plus generated values, so a mocked answer has the shape the
real API gives, errors and HTTP statuses included. One executor serves the
browser worker and the Node server, and a control channel lets an e2e test
reset, fail or reseed the mocks.

> Not published to npm yet. The install lines below are what they will be.

## Install

```bash
bun add -d @nxgt/msw-graphql msw graphql
bun add -d @graphql-tools/schema @graphql-tools/mock   # only for /schema
```

| Peer | Range | Required |
| --- | --- | --- |
| `typescript` | `^6.0.3` | yes |
| `msw` | `^2.12.10 \|\| ^3.0.0` | yes |
| `graphql` | `^16.0.0 \|\| ^17.0.0` | yes |
| `@graphql-tools/schema` | `^10.0.0` | optional, only `/schema` |
| `@graphql-tools/mock` | `^9.1.0` | optional, only `/schema` |

msw 3 needs Node >= 22.12. An SSR app whose server **runs on Bun** must stay
on msw 2: see [Traps](#traps) and [docs/guide/runtimes.md](docs/guide/runtimes.md).

The package is ESM only and its declarations use extensionless relative
imports, so `tsconfig.json` needs `"moduleResolution": "bundler"`.

## Setup

An SPA's browser worker needs msw's service worker script in `public/`:

```bash
bunx msw init public/ --save
```

An SSR/BFF app needs nothing: the Node server patches the process.

## Subpaths

| Subpath | Exports | Needs |
| --- | --- | --- |
| `@nxgt/msw-graphql` | `createExecutor`, `graphqlEndpoint`, `GraphQLHttpError`, `bearerToken`, `createMockState`, `mockState`, `failure`; types `Executor`, `ExecutorInput`, `ExecutorOptions`, `MockState` | `msw`, `graphql` |
| `@nxgt/msw-graphql/schema` | `buildMockSchema` | + `@graphql-tools/schema`, `@graphql-tools/mock` |
| `@nxgt/msw-graphql/sdl` | `loadSdl` | nothing |
| `@nxgt/msw-graphql/browser` | `enableMocking` (msw worker, handlers imported on demand) | `msw`, a browser |
| `@nxgt/msw-graphql/node` | `startMockServer` (msw server for SSR/BFF loaders) | `msw` |
| `@nxgt/msw-graphql/control` | `createMockControl` (`reset`, `fail`, `scenario`, `override`, `handle`), `UnknownScenarioError`; types `Override`, `Scenarios`, `MockControl` | `msw`, `graphql` |
| `@nxgt/msw-graphql/response` | `ok`, `created`, `noContent`, `badRequest`, `unauthorized`, `forbidden`, `notFound`, `graphqlErrors` | `msw` |

## Usage

### Schema and handlers

```ts
// mocks/handlers.ts
import { bearerToken, createExecutor, graphqlEndpoint, GraphQLHttpError } from '@nxgt/msw-graphql';
import { buildMockSchema } from '@nxgt/msw-graphql/schema';
import { loadSdl } from '@nxgt/msw-graphql/sdl';

const typeDefs = await loadSdl({
	vite: () => import('~/graphql/schema.graphql?raw'),
	file: new URL('../graphql/schema.graphql', import.meta.url),
});

const execute = createExecutor({
	schema: buildMockSchema({
		typeDefs,
		mocks: { Date: () => '2020-01-01' }, // one value per custom scalar
		resolvers: { Query: { student: (_root, { id }: { id: string }) => {
			if (id === '404') throw new GraphQLHttpError('students.not-found', 404);
			return { id, name: 'Ada' };
		} } },
	}),
	context: (request) => ({ token: bearerToken(request) }),
});

export const handlers = [graphqlEndpoint('https://api.example.com/graphql', execute)];
```

Every field without a resolver is generated from its type. Details:
[executor](docs/guide/executor.md), [schema](docs/guide/schema.md).

### Setup A: an SPA (browser worker)

```ts
// src/main.tsx
import { enableMocking } from '@nxgt/msw-graphql/browser';

await enableMocking({
	enabled: import.meta.env.VITE_MOCKS === 'true',
	handlers: () => import('../mocks/handlers'),
});

const { render } = await import('./render'); // your app's entry
render();
```

With the flag off, neither `msw` nor the handlers are loaded. Start with
`VITE_MOCKS=true bun dev`.

### Setup B: an SSR/BFF app (Node server, control, Playwright)

The server runs the mocks in its own process, because its loaders call the API
from the server. The control is mounted so a spec can reset and steer them.

```ts
// server.ts: run by Node >= 22.12, or by Bun on msw 2
import { Hono } from 'hono';

const app = new Hono();

if (process.env.MOCKS === 'true') {
	const { handlers } = await import('./mocks/handlers');
	const { startMockServer } = await import('@nxgt/msw-graphql/node');

	const { control } = startMockServer(handlers, {
		reset: () => resetMocks(), // your reseed
		scenarios: {
			empty: () => emptyMocks(),
			remove: ({ id }: { id: string }) => removeRecord(id),
		},
	});
	app.all('/__mocks/*', async ({ req }) => (await control.handle(req.raw)) ?? new Response(null, { status: 404 }));
}
```

```ts
// playwright/fixtures.ts
import { test as base } from '@playwright/test';
import { createMockServerTest } from '@nxgt/playwright/mock-server';

export const test = createMockServerTest(base);
```

```ts
// playwright/e2e/students.spec.ts
import { test } from '../fixtures';

test('the list shows an error page while the API is down', async ({ page, mockServer }) => {
	await mockServer.fail(503);
	await page.goto('/students');
	// ...
});

test.use({
	serverMocks: [{ operationName: 'GetStudents', status: 403, errors: [{ message: 'forbidden', extensions: { http: { status: 403 } } }] }],
});
```

The mocks are reset before and after every test. Server mocks are
process-global: run these projects with `workers: 1`. Details:
[control](docs/guide/control.md).

### Unit tests without HTTP

```ts
import { createMockControl } from '@nxgt/msw-graphql/control';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

const server = setupServer(...handlers);
const control = createMockControl({ server });

control.fail(503);
await control.reset();
```

## Traps

- **msw 3 does not intercept Bun's `fetch`.** A server running on Bun that
  uses `startMockServer` stays on `msw ^2.12.10`; check with
  the one-line probe in [docs/guide/runtimes.md](docs/guide/runtimes.md).
- **`typescript-msw` handlers do not work on msw 3.** `graphql.query` is gone
  from `msw`; use `graphqlEndpoint(url, execute)`.
- **The control and `/node` throw under `NODE_ENV=production`.** Import them
  behind the mocks flag, dynamically, so a production build never ships them.
- **The `?raw` import must stay a literal** in `loadSdl({ vite })`: Vite can only
  inline what it sees.
- **Mocks are process-global**: one server, one `mockState`. Parallel specs
  against one app server will trample each other.

## Documentation

- [docs/README.md](docs/README.md): the guide index.
- [docs/troubleshooting.md](docs/troubleshooting.md): an error message, its cause and fix.
- [docs/roadmap.md](docs/roadmap.md): what is coming, and what is not planned.

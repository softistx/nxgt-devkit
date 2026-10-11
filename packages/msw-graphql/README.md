# @nxgt/msw-graphql

Mock a GraphQL API with [msw](https://mswjs.io) by executing the real
operations against your schema: the operation is parsed, validated and run
against resolvers plus generated values, so a mocked answer has the shape the
real API gives, errors and HTTP statuses included.

> Work in progress: this package is not published yet, and its README grows
> with each slice of the effort that builds it.

## Install

```bash
bun add -d @nxgt/msw-graphql msw graphql
bun add -d @graphql-tools/schema @graphql-tools/mock   # only for /schema
```

Peers: `msw` (`^2.12.10 || ^3.0.0`), `graphql` (`^16.0.0 || ^17.0.0`), and the
two optional `@graphql-tools/*` packages for `/schema`.

## Subpaths

| Subpath | Exports | Needs |
| --- | --- | --- |
| `@nxgt/msw-graphql` | `createExecutor`, `graphqlEndpoint`, `GraphQLHttpError`, `bearerToken`, `createMockState`, `mockState`, `failure`; types `Executor`, `ExecutorInput`, `ExecutorOptions`, `MockState` | `msw`, `graphql` |
| `@nxgt/msw-graphql/schema` | `buildMockSchema` | + `@graphql-tools/schema`, `@graphql-tools/mock` |
| `@nxgt/msw-graphql/sdl` | `loadSdl` | nothing |
| `@nxgt/msw-graphql/browser` | `enableMocking` (msw worker, handlers imported on demand) | `msw`, a browser |
| `@nxgt/msw-graphql/node` | `startMockServer` (msw server for SSR/BFF loaders) | `msw` |
| `@nxgt/msw-graphql/response` | `ok`, `created`, `noContent`, `badRequest`, `unauthorized`, `forbidden`, `notFound`, `graphqlErrors` | `msw` |

## Usage

```ts
import { bearerToken, createExecutor, graphqlEndpoint } from '@nxgt/msw-graphql';
import { buildMockSchema } from '@nxgt/msw-graphql/schema';
import { loadSdl } from '@nxgt/msw-graphql/sdl';

const typeDefs = await loadSdl({
	vite: () => import('~/graphql/schema.graphql?raw'),
	file: new URL('../graphql/schema.graphql', import.meta.url),
});

const execute = createExecutor({
	schema: buildMockSchema({ typeDefs, resolvers }),
	context: (request) => ({ token: bearerToken(request) }),
});

export const handlers = [graphqlEndpoint(env.API_URL, execute)];
```

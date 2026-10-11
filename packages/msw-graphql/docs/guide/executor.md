# The executor

`createExecutor` turns a schema into a function from one GraphQL operation to
a `Response`, the way a GraphQL server answers an HTTP call. It is a plain
function, not an msw handler, so `graphqlEndpoint`, a hand-written handler and
a unit test all share it.

```ts
import { createExecutor, graphqlEndpoint } from '@nxgt/msw-graphql';
import { buildMockSchema } from '@nxgt/msw-graphql/schema';

const execute = createExecutor({
	schema: buildMockSchema({ typeDefs: 'type Query { hello: String! }' }),
});

export const handlers = [graphqlEndpoint('https://api.example.com/graphql', execute)];
```

```ts
type ExecutorInput = {
	query: string;
	variables?: Record<string, unknown> | null;
	operationName?: string | null;
	request: Request; // the context and the guard read its headers
};
type Executor = (input: ExecutorInput) => Promise<Response>;

function createExecutor<TContext = unknown>(options: ExecutorOptions<TContext>): Executor;
```

## Options

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `schema` | `GraphQLSchema` | required | What operations run against: [buildMockSchema](schema.md) or any executable schema |
| `context` | `(request) => TContext \| Promise<TContext>` | none | The `contextValue` of each execution, read from the request (the token, a header). Resolvers receive it as their third argument |
| `guard` | `(request) => GraphQLHttpError \| null \| undefined` (or a promise) | none | Refuses a request before it is parsed |
| `state` | `MockState` | `mockState` | Where `failing` is read. The default is the process-global state `createMockControl` also defaults to, so the two meet without wiring |

## The order

Each call goes through these steps, and the first that answers ends it:

1. **Failing**: while `state.failing` is set (by `control.fail(status)`), every call answers that status. `503` has an empty body; any other status answers `{ errors: [{ message: 'INTERNAL_SERVER_ERROR', extensions: { code: 'INTERNAL_SERVER_ERROR', http: { status } } }] }`.
2. **Guard**: if it returns an error, the answer is `{ errors: [error] }` with `error.status` as HTTP status.
3. **Parse**: a syntax error answers `400` with `{ errors }`.
4. **Validate**: validation errors against the schema answer `400`.
5. **Execute**, with the `context`.
6. **Status**: the first error with an `extensions.http.status` number sets the HTTP status; otherwise `200`, even with `errors` (as GraphQL servers do).
7. The result is round-tripped through JSON, so the client reads exactly what was serialised.

`graphqlEndpoint` sits in front: a body that is not JSON, or has no `query`
string, answers `400` before the executor runs.

## The guard

Refuse a request the real API would, for instance a client header it demands:

```ts
import { createExecutor, GraphQLHttpError } from '@nxgt/msw-graphql';

const execute = createExecutor({
	schema,
	guard: (request) =>
		request.headers.get('x-client') ? null : new GraphQLHttpError('client.missing', 400),
});
```

## The context

```ts
import { bearerToken, createExecutor } from '@nxgt/msw-graphql';

const execute = createExecutor<{ token: string | null }>({
	schema,
	context: (request) => ({ token: bearerToken(request) }),
});
```

`bearerToken(request)` returns the token of `Authorization: Bearer <token>`,
else `null`. No JWT helpers ship: they would carry each app's issuer, secret
and audience.

## Errors and statuses: `GraphQLHttpError`

```ts
class GraphQLHttpError extends GraphQLError {
	readonly status: number;
	constructor(code: string, status: number, extensions?: Record<string, unknown>);
}
```

The message is the `code`; `extensions` is `{ code, http: { status }, ...extensions }`.
Throw it from a resolver to answer a status:

```ts
import { GraphQLHttpError } from '@nxgt/msw-graphql';

const resolvers = {
	Query: {
		student: (_root: unknown, { id }: { id: string }) => {
			if (id === '404') throw new GraphQLHttpError('students.not-found', 404);
			throw new GraphQLHttpError('teapot', 418, { hint: 'tea' });
		},
	},
};
```

A plain `Error` thrown in a resolver is an ordinary GraphQL error: `200` with
`errors`, since it names no status.

## Calling it without msw

```ts
import { expect, test } from 'bun:test';

test('a missing student is a 404', async () => {
	const response = await execute({
		query: 'query ($id: ID!) { student(id: $id) { name } }',
		variables: { id: '404' },
		request: new Request('http://api.test/graphql', { method: 'POST' }),
	});
	expect(response.status).toBe(404);
});
```

`failure(status)` is the executor's down-API answer, exported to build the
same `Response` by hand. `createMockState()` makes a private `MockState` for a
test that must not share the process-global one:

```ts
import { createExecutor, createMockState } from '@nxgt/msw-graphql';
import { createMockControl } from '@nxgt/msw-graphql/control';

const state = createMockState();
const execute = createExecutor({ schema, state });
const control = createMockControl({ server, state });
```

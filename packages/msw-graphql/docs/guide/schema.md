# Schema and SDL

`buildMockSchema` makes an executable schema whose fields are generated from
their types unless you wrote a resolver; `loadSdl` reads the SDL in Vite and
in Node alike.

```ts
import { buildMockSchema } from '@nxgt/msw-graphql/schema';

const schema = buildMockSchema({
	typeDefs: /* GraphQL */ `
		scalar Date
		type Student { id: ID!, name: String!, born: Date!, grade: Int! }
		type Query { students: [Student!]!, student(id: ID!): Student }
	`,
	mocks: { Date: () => '2020-01-01' },
	resolvers: {
		Query: { student: (_root, { id }: { id: string }) => ({ id, name: 'Ada' }) },
	},
});
```

`student` returns `name: 'Ada'` from the resolver; `born`, `grade` and the
whole `students` list are generated. A resolver always wins over a generated
value.

## `buildMockSchema`

Needs the optional peers `@graphql-tools/schema` and `@graphql-tools/mock`.

```ts
type MockSchemaOptions<TContext = unknown> = {
	typeDefs: IExecutableSchemaDefinition<TContext>['typeDefs'];
	resolvers?: IExecutableSchemaDefinition<TContext>['resolvers'];
	mocks?: IMocks;
};
function buildMockSchema<TContext = unknown>(options: MockSchemaOptions<TContext>): GraphQLSchema;
```

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `typeDefs` | SDL string, document or list | required | The schema, usually from `loadSdl()` |
| `resolvers` | `makeExecutableSchema` resolvers | none | Hand-written answers; they win over mocks |
| `mocks` | `IMocks` | none | Generated values by type name; give one per custom scalar |

It is `makeExecutableSchema` followed by `addMocksToSchema({ preserveResolvers: true })`.
Pass `TContext` to type the third resolver argument, matching the executor's
`context`:

```ts
const schema = buildMockSchema<{ token: string | null }>({
	typeDefs,
	resolvers: { Query: { whoami: (_root, _args, context) => context.token } },
});
```

Any other executable `GraphQLSchema` works with `createExecutor`; this helper
is only the quick way to get one.

## `loadSdl`

```ts
type LoadSdlOptions = {
	vite?: () => Promise<string | { default: string }>;
	file?: URL | string;
};
function loadSdl(options: LoadSdlOptions): Promise<string>;
```

```ts
import { loadSdl } from '@nxgt/msw-graphql/sdl';

const typeDefs = await loadSdl({
	vite: () => import('~/graphql/schema.graphql?raw'),
	file: new URL('../graphql/schema.graphql', import.meta.url),
});
```

| Option | Effect |
| --- | --- |
| `vite` | Where Vite finds the SDL. The `?raw` import must stay a literal inside your app: Vite can only inline what it sees |
| `file` | Where Node, Bun and Playwright's loader read it (UTF-8) |

Which is used: `vite` when `import.meta.env` has a boolean `DEV` and a string
`BASE_URL` (Vite), or when `window` exists, or when no `file` was given;
otherwise `file`. Bun aliases `import.meta.env` to `process.env`, whose values
are strings, so Bun reads the file. Giving neither throws
`loadSdl needs a \`vite\` callback, a \`file\`, or both.` The Node branch is a
dynamic import Vite is told to leave alone, so a browser bundle never resolves
`node:fs`.

Measured here: the Node and Bun branches and the `vite`-only branch are
exercised by the specs; the Vite detection was **not exercised against a real
Vite build** in this repository.

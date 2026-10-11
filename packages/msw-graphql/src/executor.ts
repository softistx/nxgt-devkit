import {
	type DocumentNode,
	execute,
	type GraphQLError,
	type GraphQLSchema,
	parse,
	validate,
} from 'graphql';
import type { GraphQLHttpError } from './errors';
import { type MockState, mockState } from './state';

/** One GraphQL operation as an HTTP request carried it. */
export type ExecutorInput = {
	query: string;
	variables?: Record<string, unknown> | null;
	operationName?: string | null;
	/** The HTTP request: the context and the guard read its headers. */
	request: Request;
};

/** Answers an operation as a GraphQL server would, as a `Response`. */
export type Executor = (input: ExecutorInput) => Promise<Response>;

export type ExecutorOptions<TContext> = {
	schema: GraphQLSchema;
	/** The `contextValue` of each execution, from the request's headers. */
	context?: (request: Request) => TContext | Promise<TContext>;
	/**
	 * Refuses a request before it is parsed — a client header the real API
	 * demands, say. Return the error to answer with (its `status` is the HTTP
	 * status), or nothing to let the request through.
	 */
	guard?: (
		request: Request,
	) =>
		| GraphQLHttpError
		| null
		| undefined
		| Promise<GraphQLHttpError | null | undefined>;
	/** Where `failing` is read. Defaults to the state `createMockControl` shares. */
	state?: MockState;
};

function json(body: unknown, status: number): Response {
	return Response.json(body, { status });
}

function invalid(errors: ReadonlyArray<GraphQLError>): Response {
	return json({ errors: errors.map((error) => error.toJSON()) }, 400);
}

/** The answer of an API that is down: 503 has no body, others an error. */
export function failure(status: number): Response {
	if (status === 503) return new Response(null, { status });
	const error = {
		message: 'INTERNAL_SERVER_ERROR',
		extensions: { code: 'INTERNAL_SERVER_ERROR', http: { status } },
	};
	return json({ errors: [error] }, status);
}

/** The first error that carries an `extensions.http.status`, else 200. */
function statusOf(errors: ReadonlyArray<GraphQLError> | undefined): number {
	for (const error of errors ?? []) {
		const status = (error.extensions?.http as { status?: unknown } | undefined)
			?.status;
		if (typeof status === 'number') return status;
	}
	return 200;
}

/**
 * Parses, validates and executes each operation against `schema`, the way a
 * GraphQL server does, in this order: the API made to fail (`state.failing`),
 * the `guard`, parse (400), validate (400), execute, then the HTTP status of
 * the first error that names one.
 *
 * A plain function of an operation, not an msw handler, so a generated
 * `mockGetStudentsQuery(({ query, variables }) => execute(...))` and
 * `graphqlEndpoint(url, execute)` share it, and a unit test can call it with
 * a hand-made `Request`.
 */
export function createExecutor<TContext = unknown>(
	options: ExecutorOptions<TContext>,
): Executor {
	const { schema, context, guard, state = mockState } = options;

	return async ({ query, variables, operationName, request }) => {
		if (state.failing !== null) return failure(state.failing);

		const refused = await guard?.(request);
		if (refused) {
			return json({ errors: [refused.toJSON()] }, refused.status);
		}

		let document: DocumentNode;
		try {
			document = parse(query);
		} catch (error) {
			return invalid([error as GraphQLError]);
		}
		const errors = validate(schema, document);
		if (errors.length > 0) return invalid(errors);

		const result = await execute({
			schema,
			document,
			variableValues: variables ?? undefined,
			operationName: operationName ?? undefined,
			contextValue: await context?.(request),
		});
		// Through JSON: what the client reads is what was serialised, errors
		// and `undefined` fields included.
		const body = JSON.parse(JSON.stringify(result));
		return json(body, statusOf(result.errors));
	};
}

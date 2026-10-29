import {
	type DocumentNode,
	type ExecutionResult,
	GraphQLError,
	type GraphQLSchema,
	getOperationAST,
	subscribe,
} from 'graphql';
import type { MockState } from './state';

/** A running event stream the mocks can end: see {@link closeStreams}. */
export type MockStream = { close: () => void };

const encoder = new TextEncoder();

const isAsyncIterable = (
	value: unknown,
): value is AsyncIterable<ExecutionResult> =>
	typeof value === 'object' &&
	value !== null &&
	typeof (value as AsyncIterable<unknown>)[Symbol.asyncIterator] === 'function';

/** Whether the request asks for the graphql-sse stream. */
export function wantsEventStream(request: Request): boolean {
	return request.headers.get('accept')?.includes('text/event-stream') ?? false;
}

/** Whether the operation `operationName` selects in `document` is a subscription. */
export function isSubscription(
	document: DocumentNode,
	operationName?: string | null,
): boolean {
	return (
		getOperationAST(document, operationName ?? undefined)?.operation ===
		'subscription'
	);
}

const frame = (event: string, data?: unknown) =>
	encoder.encode(
		`event: ${event}\ndata:${data === undefined ? '' : ` ${JSON.stringify(data)}`}\n\n`,
	);

/** The headers a refusal names with `extensions.http.headers`, if any. */
function refusalHeaders(errors: ReadonlyArray<GraphQLError>): Headers {
	const headers = new Headers();
	for (const error of errors) {
		const named = (error.extensions?.http as { headers?: unknown } | undefined)
			?.headers;
		if (typeof named !== 'object' || named === null) continue;
		for (const [key, value] of Object.entries(named))
			headers.set(key, String(value));
	}
	return headers;
}

type Options = {
	schema: GraphQLSchema;
	document: DocumentNode;
	variables?: Record<string, unknown> | null;
	operationName?: string | null;
	context: unknown;
	request: Request;
	state: MockState;
	/** The HTTP status of a refusal, from the errors. */
	statusOf: (errors: ReadonlyArray<GraphQLError> | undefined) => number;
};

/**
 * Runs a subscription and answers it as the graphql-sse "distinct connections"
 * protocol, the format GraphQL Yoga serves: `event: next` with the result,
 * then `event: complete`.
 *
 * - A refusal before the stream (the `subscribe` resolver throws, say a
 *   `GraphQLHttpError('x', 429)`) answers a JSON `{ errors }` with a real HTTP
 *   status, and the headers of `extensions.http.headers` (a `retry-after`).
 * - A failure mid-stream (the iterator throws) is a last `next` event with
 *   `{ errors }`, then `complete`.
 * - The stream ends when the iterator ends, when the client aborts, or when
 *   `closeStreams` runs (the control's `reset()`).
 */
export async function serveSubscription(options: Options): Promise<Response> {
	const { request, state } = options;
	const source = await subscribe({
		schema: options.schema,
		document: options.document,
		variableValues: options.variables ?? undefined,
		operationName: options.operationName ?? undefined,
		contextValue: options.context,
	});

	if (!isAsyncIterable(source)) {
		const body = JSON.parse(JSON.stringify(source));
		return Response.json(body, {
			status: options.statusOf(source.errors),
			headers: refusalHeaders(source.errors ?? []),
		});
	}

	const iterator = source[Symbol.asyncIterator]();
	let stream: MockStream | undefined;
	let closed = false;
	let controller!: ReadableStreamDefaultController<Uint8Array>;
	const finish = () => {
		if (closed) return;
		closed = true;
		if (stream) state.streams.delete(stream);
		request.signal.removeEventListener('abort', finish);
		// Not awaited: a generator suspended in a `yield` returns at once, one
		// stuck in an `await` returns when that settles.
		void Promise.resolve(iterator.return?.()).catch(() => {});
		try {
			controller.close();
		} catch {
			// Already closed by the consumer's cancel.
		}
	};
	stream = { close: finish };

	const body = new ReadableStream<Uint8Array>({
		start(c) {
			controller = c;
			state.streams.add(stream as MockStream);
			request.signal.addEventListener('abort', finish);
			void pump();
		},
		cancel() {
			finish();
		},
	});

	async function pump() {
		try {
			for (;;) {
				const step = await iterator.next();
				if (closed) return;
				if (step.done) break;
				controller.enqueue(
					frame('next', JSON.parse(JSON.stringify(step.value))),
				);
			}
		} catch (cause) {
			if (closed) return;
			const error =
				cause instanceof GraphQLError
					? cause
					: new GraphQLError(
							cause instanceof Error ? cause.message : String(cause),
						);
			controller.enqueue(frame('next', { errors: [error.toJSON()] }));
		}
		if (closed) return;
		controller.enqueue(frame('complete'));
		finish();
	}

	return new Response(body, {
		status: 200,
		headers: {
			'content-type': 'text/event-stream; charset=utf-8',
			'cache-control': 'no-cache',
			connection: 'keep-alive',
		},
	});
}

/**
 * Ends every event stream the mocks are serving: the iterators are returned
 * and the clients read a clean end of stream. The control's `reset()` calls it,
 * so a test starts from no live stream.
 */
export function closeStreams(state: MockState): void {
	for (const stream of [...state.streams]) stream.close();
}

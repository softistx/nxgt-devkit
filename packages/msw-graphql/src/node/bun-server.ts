import type { AnyHandler } from 'msw';
import { answer, createHandlerStore, unmarkBypass } from '../handlers';

/** What a function `onUnhandledRequest` prints with, as in msw 2. */
export type UnhandledPrint = {
	warning(): Promise<void>;
	error(): Promise<void>;
};
export type UnhandledStrategy =
	| 'bypass'
	| 'warn'
	| 'error'
	| ((request: Request, print: UnhandledPrint) => void | Promise<void>);

type ListenOptions = {
	onUnhandledRequest?: UnhandledStrategy;
	/** msw 3's name for the same option; `onUnhandledRequest` wins. */
	onUnhandledFrame?: unknown;
};

/** Bun, whose native `fetch` msw 3's Node interceptors never see (mswjs/msw#2811). */
export const isBun = (): boolean =>
	typeof process !== 'undefined' && Boolean(process.versions?.bun);

/**
 * Whether `server` is msw 3's Node server, the one that skips Bun's `fetch`:
 * msw 3 gave `setupServer` a public `readyState` that msw 2 does not have.
 */
export const isMsw3Server = (server: object): boolean => 'readyState' in server;

// What msw leaves alone under 'warn' and 'error': assets a dev server serves.
const COMMON_ASSET =
	/\.(s?css|less|m?[jt]sx?|json|map|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf)$/i;

async function unhandledMessage(request: Request): Promise<string> {
	const url = new URL(request.url);
	const body = request.body == null ? '' : await request.clone().text();
	return `intercepted a request without a matching request handler:\n\n  • ${request.method} ${url.origin}${url.pathname}${url.search}\n\n${body ? `  • Request body: ${body}\n\n` : ''}If you still wish to intercept this unhandled request, please create a request handler for it.\nRead more: https://mswjs.io/docs/http/intercepting-requests`;
}

/** Reacts to a request no handler answered, as msw's `onUnhandledRequest` does. */
async function reactToUnhandled(
	strategy: UnhandledStrategy,
	request: Request,
): Promise<void> {
	const print: UnhandledPrint = {
		warning: async () =>
			console.warn(`[MSW] Warning: ${await unhandledMessage(request)}`),
		error: async () =>
			console.error(`[MSW] Error: ${await unhandledMessage(request)}`),
	};
	if (typeof strategy === 'function') {
		await strategy(request.clone(), print);
		return;
	}
	if (strategy === 'bypass') return;
	if (COMMON_ASSET.test(new URL(request.url).pathname)) return;
	await print[strategy === 'warn' ? 'warning' : 'error']();
	if (strategy === 'error')
		throw new Error(
			'[MSW] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.',
		);
}

/** What `createFetchServer` returns: `setupServer`'s API without `events` and `boundary()`, which throw. */
export type FetchServer = {
	listen(options?: ListenOptions): void;
	close(): void;
	use(...handlers: AnyHandler[]): void;
	resetHandlers(...next: AnyHandler[]): void;
	restoreHandlers(): void;
	listHandlers(): readonly AnyHandler[];
	readonly events: never;
	boundary(...args: never[]): never;
};

const unsupported = (name: string) =>
	new Error(
		`@nxgt/msw-graphql: server.${name} is not available under Bun with msw 3: this server patches globalThis.fetch with msw's public getResponse and has no event emitter nor async context. Use msw 2, or run the app under Node, if you need it.`,
	);

/**
 * msw 3's server for Bun. msw 3's `setupServer` patches `node:net`, which Bun's
 * native `fetch` never goes through (mswjs/msw#2811), so this one patches
 * `globalThis.fetch` itself: each request is resolved with msw's public
 * `getResponse(handlers, request)` (the one `createMockFetch` uses), and falls
 * back to the original `fetch` when no handler answers. Only `fetch` is
 * mocked, not `node:http` clients.
 *
 * It offers `listen`, `close`, `use`, `resetHandlers`, `restoreHandlers` and
 * `listHandlers` of `setupServer`. `events` and `boundary()` throw an error
 * saying why.
 */
export function createFetchServer(handlers: AnyHandler[]): FetchServer {
	const store = createHandlerStore(handlers);
	let original: typeof fetch = globalThis.fetch;
	let listening = false;
	let strategy: UnhandledStrategy = 'warn';

	const patched = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const request = new Request(input, init);
		// As the real fetch does: an aborted signal rejects, mocked or not.
		request.signal.throwIfAborted();
		const real = original;
		const unmarked = unmarkBypass(request);
		if (unmarked) return real(unmarked);
		const mocked = await answer(store.listHandlers(), request);
		if (mocked) return mocked;
		if (mocked === undefined) await reactToUnhandled(strategy, request);
		// The caller's own arguments keep Bun's extra options (`proxy`, `tls`,
		// `unix`...) that a `Request` drops, unless a stream body was consumed.
		const reusable =
			!(input instanceof Request) && !(init?.body instanceof ReadableStream);
		return reusable ? real(input, init) : real(request);
	}) as typeof fetch;

	const server = {
		listen(options: ListenOptions = {}) {
			if (listening)
				throw new Error(
					'Failed to call "server.listen()": the server is already listening.',
				);
			const chosen = options.onUnhandledRequest ?? options.onUnhandledFrame;
			if (
				typeof chosen === 'function' ||
				chosen === 'bypass' ||
				chosen === 'warn' ||
				chosen === 'error'
			)
				strategy = chosen as UnhandledStrategy;
			else if (chosen !== undefined)
				throw new Error(
					`Failed to react to an unhandled request: unknown strategy "${String(chosen)}". Please provide one of the supported strategies ("bypass", "warn", "error") or a custom callback function.`,
				);
			original = globalThis.fetch;
			globalThis.fetch = patched;
			listening = true;
		},
		close() {
			// Only undo our own patch: a later patch on top is not ours to remove.
			if (globalThis.fetch === patched) globalThis.fetch = original;
			listening = false;
		},
		use: store.use,
		resetHandlers: store.resetHandlers,
		restoreHandlers: store.restoreHandlers,
		listHandlers: store.listHandlers,
	};
	// Non-enumerable, so spreading or logging the server does not throw.
	Object.defineProperties(server, {
		events: {
			get() {
				throw unsupported('events');
			},
		},
		boundary: {
			value() {
				throw unsupported('boundary()');
			},
		},
	});
	return server as unknown as FetchServer;
}

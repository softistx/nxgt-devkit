import type { AnyHandler } from 'msw';
import { isCommonAssetRequest } from 'msw';
import {
	answer,
	createHandlerStore,
	extraInit,
	type HandlerStore,
	unmarkBypass,
} from '../handlers';

export type UnhandledStrategy = 'bypass' | 'warn' | 'error';

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
	if (strategy === 'bypass' || isCommonAssetRequest(request)) return;
	const message = await unhandledMessage(request);
	if (strategy === 'warn') {
		console.warn(`[MSW] Warning: ${message}`);
		return;
	}
	console.error(`[MSW] Error: ${message}`);
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

const isStrategy = (value: unknown): value is UnhandledStrategy =>
	value === 'bypass' || value === 'warn' || value === 'error';

/**
 * One `listen()`'s `globalThis.fetch`: answers from the handlers while active,
 * and once stopped forwards straight to the `original` it captured.
 */
function makePatch(
	store: HandlerStore,
	strategy: UnhandledStrategy,
	original: typeof fetch,
) {
	let active = true;
	const patch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		if (!active) return original(input, init);
		const request = new Request(input, init);
		// As the real fetch does: an aborted signal rejects, mocked or not.
		request.signal.throwIfAborted();
		// A `Request` drops Bun's extra options (`unix`, `tls`, `proxy`...), so the
		// caller's init rides along without what the Request already carries.
		const extra = extraInit(init);
		const unmarked = unmarkBypass(request);
		if (unmarked) return original(unmarked, extra);
		const mocked = await answer(store.listHandlers(), request);
		if (mocked) return mocked;
		if (mocked === undefined) await reactToUnhandled(strategy, request);
		// A stream body was consumed by the Request: send the Request itself.
		const reusable =
			!(input instanceof Request) && !(init?.body instanceof ReadableStream);
		return reusable ? original(input, init) : original(request, extra);
	}) as typeof fetch;
	return {
		patch,
		stop() {
			active = false;
			if (globalThis.fetch === patch) globalThis.fetch = original;
		},
	};
}

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
	let current: { patch: typeof fetch; stop(): void } | undefined;

	const server = {
		listen(options: ListenOptions = {}) {
			if (current)
				throw new Error(
					'Failed to call "server.listen()": the server is already listening.',
				);
			const chosen = options.onUnhandledRequest ?? options.onUnhandledFrame;
			if (chosen !== undefined && !isStrategy(chosen))
				throw new Error(
					`Failed to react to an unhandled request: unknown strategy "${String(chosen)}". Please provide one of the supported strategies ("bypass", "warn", "error").`,
				);
			// A fresh patch per listen(): it captures its own original, so a patch
			// that outlives close() cannot recurse into a later one.
			current = makePatch(store, chosen ?? 'warn', globalThis.fetch);
			globalThis.fetch = current.patch;
		},
		close() {
			if (!current) return;
			// Only undo our own patch: a later wrapper on top is not ours to remove,
			// and the closed patch forwards to its original from now on.
			current.stop();
			current = undefined;
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

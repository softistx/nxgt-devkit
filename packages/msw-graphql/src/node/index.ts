import type { AnyHandler } from 'msw';
import { setupServer } from 'msw/node';
import { createMockControl, type MockControlOptions } from '../control';

export type StartMockServerOptions = Omit<MockControlOptions, 'server'> & {
	/** What to do with a request no handler matches. Defaults to `'bypass'`. */
	onUnhandledRequest?: 'bypass' | 'warn' | 'error';
};

/**
 * Starts an msw server in this process, for an SSR or BFF app whose loaders
 * call the API from the server:
 *
 * ```ts
 * const { server, control } = startMockServer(handlers, { reset: resetMocks });
 * ```
 *
 * `control` is the HTTP/programmatic channel for e2e specs (`./control`).
 * Under Bun with msw 3 it intercepts nothing: msw 3's interceptors do not see
 * Bun's native `fetch` (mswjs/msw#2811). There, give the client
 * `createMockFetch`'s fetch (`./fetch`), or stay on msw 2.
 */
export function startMockServer(
	handlers: AnyHandler[],
	options: StartMockServerOptions = {},
) {
	const { onUnhandledRequest = 'bypass', ...controlOptions } = options;
	// The control is built before the server listens: under production it
	// throws, so no server is left listening. `setupServer` only creates the
	// server; `listen()` below is what intercepts.
	const server = setupServer(...handlers);
	const control = createMockControl({ ...controlOptions, server });
	// `as never`: msw 3 renamed the option to `onUnhandledFrame` and each major
	// ignores the other's, so the options type fits neither.
	server.listen({
		onUnhandledFrame: onUnhandledRequest,
		onUnhandledRequest,
	} as never);
	return { server, control };
}

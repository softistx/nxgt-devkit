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
 * Under Bun, use msw 2: msw 3's interceptors do not see Bun's `fetch`.
 */
export function startMockServer(
	handlers: AnyHandler[],
	options: StartMockServerOptions = {},
) {
	const { onUnhandledRequest = 'bypass', ...controlOptions } = options;
	const server = setupServer(...handlers);
	// msw 3 renamed the option to `onUnhandledFrame`; each ignores the other.
	server.listen({
		onUnhandledFrame: onUnhandledRequest,
		onUnhandledRequest,
	} as never);
	// Throws under NODE_ENV=production, before it is ever mounted.
	const control = createMockControl({ ...controlOptions, server });
	return { server, control };
}

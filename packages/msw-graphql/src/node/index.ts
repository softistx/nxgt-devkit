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
	// First: under NODE_ENV=production this throws, and no server is left
	// listening. `startMockServer` is dev and test only, as the control is.
	const server = setupServer(...handlers);
	const control = createMockControl({ ...controlOptions, server });
	// msw 3 renamed the option to `onUnhandledFrame`; each ignores the other.
	server.listen({
		onUnhandledFrame: onUnhandledRequest,
		onUnhandledRequest,
	} as never);
	return { server, control };
}

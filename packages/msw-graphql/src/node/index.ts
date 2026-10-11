import type { AnyHandler } from 'msw';
import { setupServer } from 'msw/node';

export type StartMockServerOptions = {
	/** What to do with a request no handler matches. Defaults to `'bypass'`. */
	onUnhandledRequest?: 'bypass' | 'warn' | 'error';
};

/**
 * Starts an msw server in this process, for an SSR or BFF app whose loaders
 * call the API from the server:
 *
 * ```ts
 * const { server } = startMockServer(handlers);
 * ```
 *
 * Under Bun, use msw 2: msw 3's interceptors do not see Bun's `fetch`.
 */
export function startMockServer(
	handlers: AnyHandler[],
	options: StartMockServerOptions = {},
) {
	const { onUnhandledRequest = 'bypass' } = options;
	const server = setupServer(...handlers);
	// msw 3 renamed the option to `onUnhandledFrame`; each ignores the other.
	server.listen({
		onUnhandledFrame: onUnhandledRequest,
		onUnhandledRequest,
	} as never);
	return { server };
}

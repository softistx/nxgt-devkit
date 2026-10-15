import type { AnyHandler } from 'msw';
import { setupServer } from 'msw/node';
import { createMockControl, type MockControlOptions } from '../control';
import { createWebServer, isBun } from './web-server';

export type StartMockServerOptions = Omit<MockControlOptions, 'server'> & {
	/** What to do with a request no handler matches. Defaults to `'bypass'`. */
	onUnhandledRequest?: 'bypass' | 'warn' | 'error';
};

type Started = {
	server: ReturnType<typeof setupServer>;
	control: ReturnType<typeof createMockControl>;
};

const STARTED = Symbol.for('@nxgt/msw-graphql/node');
const registry = globalThis as { [STARTED]?: Started };

/**
 * Starts an msw server in this process, for an SSR or BFF app whose loaders
 * call the API from the server:
 *
 * ```ts
 * const { server, control } = startMockServer(handlers, { reset: resetMocks });
 * ```
 *
 * It is idempotent per process: a second call returns the `{ server, control }`
 * of the first, kept under `Symbol.for('@nxgt/msw-graphql/node')` on
 * `globalThis`, so an SSR entry module re-evaluated under HMR does not stack
 * a second server's listeners. **The second call's `handlers` and `options`
 * are ignored**: to change them, `server.close()` first (which forgets the
 * server, so the next call starts a new one) or `server.use(...)` /
 * `control.reset()` on the running one. `close()` is the supported way to
 * stop it; `listen()` again on a closed server does not register it again.
 * A call that finds a registered server returns it before anything else, so
 * it does not throw under `NODE_ENV=production` either: the production guard
 * ran when that server was built.
 *
 * `control` is the HTTP/programmatic channel for e2e specs (`./control`).
 * Under Bun with msw 3, `setupServer` would intercept nothing (its
 * interceptors patch `node:net`, which Bun's `fetch` never reaches,
 * mswjs/msw#2811), so the server is a custom network whose only source is
 * the `fetch/web` interceptor: it patches `globalThis.fetch`, and only
 * `fetch` (not `node:http` clients). Same `{ server, control }`.
 */
export function startMockServer(
	handlers: AnyHandler[],
	options: StartMockServerOptions = {},
) {
	const existing = registry[STARTED];
	if (existing) return existing;
	const { onUnhandledRequest = 'bypass', ...controlOptions } = options;
	// The control is built before the server listens: under production it
	// throws, so no server is left listening. `setupServer` only creates the
	// server; `listen()` below is what intercepts.
	// Under Bun, msw 3's `setupServer` intercepts nothing: use a network on
	// the `fetch/web` interceptor (`./web-server`). Node, and msw 2, keep
	// `setupServer`.
	const server =
		(isBun() ? createWebServer(handlers) : undefined) ??
		setupServer(...handlers);
	const control = createMockControl({ ...controlOptions, server });
	// `as never`: msw 3 renamed the option to `onUnhandledFrame` and each major
	// ignores the other's, so the options type fits neither.
	server.listen({
		onUnhandledFrame: onUnhandledRequest,
		onUnhandledRequest,
	} as never);
	// Closing forgets it, so the next call starts a fresh server. Only the
	// registered server may clear the slot: a stale `close()` on a server that
	// was already replaced must not unregister its successor.
	const forget = () => {
		if (registry[STARTED]?.server === server) delete registry[STARTED];
	};
	const close = server.close.bind(server);
	server.close = () => {
		forget();
		return close();
	};
	// msw 2.12.10 to 2.14 expose a public `dispose()` that stops the server
	// without going through `close`, so it forgets the server too. Later
	// versions and msw 3 may not have one.
	const disposable = server as { dispose?: () => void };
	const dispose = disposable.dispose?.bind(server);
	if (dispose)
		disposable.dispose = () => {
			forget();
			return dispose();
		};
	const started = { server, control };
	registry[STARTED] = started;
	return started;
}

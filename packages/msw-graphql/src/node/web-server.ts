import { createRequire } from 'node:module';
import type { AnyHandler } from 'msw';
import type { setupServer } from 'msw/node';

type MswServer = ReturnType<typeof setupServer>;

/** What of msw 3's `defineNetwork` this file calls; typed here so msw 2 still typechecks. */
type Network = {
	readyState: number;
	events: unknown;
	enable: () => unknown;
	disable: () => unknown;
	configure: (options: { onUnhandledFrame?: unknown }) => void;
	use: (...handlers: AnyHandler[]) => void;
	resetHandlers: (...handlers: AnyHandler[]) => void;
	restoreHandlers: () => void;
	listHandlers: () => ReadonlyArray<AnyHandler>;
};

/** Bun, whose native `fetch` msw 3's Node interceptors never see (mswjs/msw#2811). */
export const isBun = (): boolean =>
	typeof process !== 'undefined' && Boolean(process.versions?.bun);

/**
 * msw 3's server for a runtime that is not Node, built the way msw's
 * maintainer recommends in mswjs/msw#2811: a custom network
 * (`defineNetwork`, `msw/experimental`) whose only source is the `fetch/web`
 * interceptor, which patches `globalThis.fetch` itself instead of `node:net`.
 * It starts from `msw/node`'s `defaultNetworkOptions` and its
 * `AsyncHandlersController`, so `onUnhandledFrame`, quiet logging and
 * `boundary()` behave as in `setupServer`.
 *
 * Returns `undefined` on msw 2, whose `setupServer` already intercepts Bun's
 * `fetch`.
 *
 * The three modules are loaded with `require`, from msw's own location, so the
 * interceptors are the very copy msw uses and the package needs no dependency
 * of its own; `require` also keeps `startMockServer` synchronous.
 */
export function createWebServer(handlers: AnyHandler[]): MswServer | undefined {
	const here = createRequire(import.meta.url);
	// msw 2.13 to 2.15 already ship `defineNetwork` and `defaultNetworkOptions`
	// but intercept Bun's `fetch` through `setupServer`, and their interceptors
	// have no `fetch/web`: only the major tells msw 3 apart.
	const major = Number(
		(here('msw/package.json') as { version: string }).version.split('.')[0],
	);
	if (major < 3) return;
	const node = here('msw/node') as {
		defaultNetworkOptions: Record<string, unknown>;
		AsyncHandlersController: new (
			handlers: AnyHandler[],
		) => { boundary: MswServer['boundary'] };
	};
	const { defaultNetworkOptions, AsyncHandlersController } = node;
	const experimental = here('msw/experimental') as {
		defineNetwork: (options: unknown) => Network;
		InterceptorSource: new (options: { interceptors: unknown[] }) => unknown;
	};
	const { FetchInterceptor } = createRequire(here.resolve('msw/node'))(
		'@mswjs/interceptors/fetch/web',
	) as { FetchInterceptor: new () => unknown };

	const controller = new AsyncHandlersController(handlers);
	const network = experimental.defineNetwork({
		...defaultNetworkOptions,
		sources: [
			new experimental.InterceptorSource({
				interceptors: [new FetchInterceptor()],
			}),
		],
		handlers: controller,
	});
	// The surface of msw 3's `setupServer`, over the custom network.
	return {
		get readyState() {
			return network.readyState;
		},
		events: network.events,
		listen(options?: { onUnhandledFrame?: unknown }) {
			if (network.readyState !== 0)
				throw new Error(
					'Failed to call "server.listen()": the server is already listening.',
				);
			network.configure({
				onUnhandledFrame: options?.onUnhandledFrame ?? 'warn',
			});
			network.enable();
		},
		close() {
			network.disable();
		},
		use: network.use.bind(network),
		resetHandlers: network.resetHandlers.bind(network),
		restoreHandlers: network.restoreHandlers.bind(network),
		listHandlers: network.listHandlers.bind(network),
		boundary: controller.boundary.bind(controller),
	} as unknown as MswServer;
}

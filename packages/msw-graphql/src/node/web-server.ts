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

type NodeModule = {
	defaultNetworkOptions: Record<string, unknown>;
	AsyncHandlersController: new (
		handlers: AnyHandler[],
	) => { boundary: MswServer['boundary'] };
};
type ExperimentalModule = {
	defineNetwork: (options: unknown) => Network;
	InterceptorSource: new (options: { interceptors: unknown[] }) => unknown;
};
type FetchWebModule = { FetchInterceptor: new () => unknown };

/**
 * Throws a readable error when an msw 3 minor moved what the Bun path relies
 * on. Pure, so a spec can feed it the shapes of a future msw.
 */
export function assertWebServerModules(
	mswVersion: string,
	node: Partial<NodeModule>,
	experimental: Partial<ExperimentalModule>,
	fetchWeb: Partial<FetchWebModule>,
): void {
	const missing = [
		['defineNetwork', experimental.defineNetwork],
		['InterceptorSource', experimental.InterceptorSource],
		['AsyncHandlersController', node.AsyncHandlersController],
		['defaultNetworkOptions', node.defaultNetworkOptions],
		['FetchInterceptor', fetchWeb.FetchInterceptor],
	]
		.filter(([, value]) => value === undefined)
		.map(([name]) => name);
	if (missing.length === 0) return;
	throw new Error(
		`@nxgt/msw-graphql cannot mock fetch under Bun with msw ${mswVersion}: ${missing.join(', ')} not found. Its Bun path needs msw/experimental's defineNetwork and msw's @mswjs/interceptors/fetch/web (see mswjs/msw#2811).`,
	);
}

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
	const mswVersion = (here('msw/package.json') as { version: string }).version;
	const major = Number(mswVersion.split('.')[0]);
	if (major < 3) return;
	const node = here('msw/node') as Partial<NodeModule>;
	const experimental = here('msw/experimental') as Partial<ExperimentalModule>;
	const fetchWeb = createRequire(here.resolve('msw/node'))(
		'@mswjs/interceptors/fetch/web',
	) as Partial<FetchWebModule>;
	assertWebServerModules(mswVersion, node, experimental, fetchWeb);
	const { defaultNetworkOptions, AsyncHandlersController } = node as NodeModule;
	const { FetchInterceptor } = fetchWeb as FetchWebModule;

	const controller = new AsyncHandlersController(handlers);
	const network = (experimental as ExperimentalModule).defineNetwork({
		...defaultNetworkOptions,
		sources: [
			new (experimental as ExperimentalModule).InterceptorSource({
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

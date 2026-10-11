import type { setupWorker } from 'msw/browser';

type Handlers = Parameters<typeof setupWorker>;
type WorkerStart = NonNullable<
	Parameters<ReturnType<typeof setupWorker>['start']>[0]
>;

export type EnableMockingOptions = {
	/** Whether to start the worker at all: the app's mocks flag. */
	enabled: boolean;
	/**
	 * The handlers, imported on demand so a production bundle that never
	 * enables mocking never carries them:
	 * `handlers: () => import('./handlers')`. The module's `handlers` export,
	 * its default export or an array are all accepted.
	 */
	handlers: () => Promise<
		Handlers | { handlers: Handlers } | { default: Handlers }
	>;
	/** `worker.start()` options, over `onUnhandledRequest: 'bypass'`. */
	start?: WorkerStart;
};

/**
 * Starts the msw browser worker when `enabled`, before the app renders:
 *
 * ```ts
 * await enableMocking({ enabled: MOCKS_ENABLED, handlers: () => import('./handlers') });
 * ```
 *
 * Resolves to the worker, or to `null` when mocking is off. Neither `msw` nor
 * the handlers are loaded in that case.
 */
export async function enableMocking(options: EnableMockingOptions) {
	if (!options.enabled) return null;
	const [{ setupWorker }, loaded] = await Promise.all([
		import('msw/browser'),
		options.handlers(),
	]);
	const handlers = Array.isArray(loaded)
		? loaded
		: 'handlers' in loaded
			? loaded.handlers
			: loaded.default;
	const worker = setupWorker(...handlers);
	// msw 3 renamed the option to `onUnhandledFrame`; each ignores the other.
	await worker.start({
		onUnhandledFrame: 'bypass',
		onUnhandledRequest: 'bypass',
		...options.start,
	} as WorkerStart);
	return worker;
}

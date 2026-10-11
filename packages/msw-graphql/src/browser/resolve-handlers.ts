import type { setupWorker } from 'msw/browser';

type Handlers = Parameters<typeof setupWorker>;

/**
 * The handler list of what `handlers()` resolved to, whatever its shape.
 * Internal: not an entry point and not exported from `./browser`.
 */
export function resolveHandlers(
	loaded: Handlers | { handlers: Handlers } | { default: Handlers },
): Handlers {
	if (Array.isArray(loaded)) return loaded as Handlers;
	return 'handlers' in loaded ? loaded.handlers : loaded.default;
}

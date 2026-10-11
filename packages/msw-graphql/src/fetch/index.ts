import { getResponse } from 'msw';
import { createMockControl, type MockControlOptions } from '../control';

export type CreateMockFetchOptions = Omit<MockControlOptions, 'server'> & {
	/** Throw on a request no handler matches, instead of sending it for real. */
	strict?: boolean;
	/** Where an unhandled request goes. Defaults to the global `fetch`. */
	fallback?: typeof fetch;
};

/**
 * A `fetch` answered by the handlers, for an SSR or BFF app whose API client
 * takes a fetch — no global patch, so it works where msw's interceptors do not
 * (msw 3 under Bun, mswjs/msw#2811):
 *
 * ```ts
 * const { fetch, control } = createMockFetch(handlers, { reset: resetMocks });
 * const client = createClient({ url, fetch });
 * ```
 *
 * A request no handler matches goes to `fallback` (the real `fetch`), or
 * throws with `strict`. `control` is the same channel as `startMockServer`'s:
 * its overrides go in front of the handlers until the next reset.
 */
export function createMockFetch(
	handlers: readonly unknown[],
	options: CreateMockFetchOptions = {},
) {
	const { strict = false, fallback, ...controlOptions } = options;
	const initial = [...handlers];
	let current = [...initial];
	const server = {
		// Runtime handlers first, as msw's `server.use` does.
		use: (...added: unknown[]) => {
			current = [...added, ...current];
		},
		resetHandlers: () => {
			current = [...initial];
		},
		listHandlers: (): readonly unknown[] => current,
	};
	const control = createMockControl({ ...controlOptions, server });

	const mockFetch = async (
		input: RequestInfo | URL,
		init?: RequestInit,
	): Promise<Response> => {
		const request = new Request(input, init);
		// As the real fetch does: an aborted signal rejects, mocked or not.
		request.signal.throwIfAborted();
		// `as never`: msw 2 and 3 name their handler types differently.
		const mocked = await getResponse(current as never, request.clone());
		if (mocked) return mocked;
		if (strict) {
			throw new Error(
				`createMockFetch: no handler for ${request.method} ${request.url}.`,
			);
		}
		return (fallback ?? globalThis.fetch)(request);
	};
	return { fetch: mockFetch as typeof fetch, control, server };
}

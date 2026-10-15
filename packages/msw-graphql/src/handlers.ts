import { getResponse } from 'msw';

/**
 * The handler list behind `createMockFetch` and `startMockServer` under Bun
 * (msw 3): the same semantics as msw's `use`, `resetHandlers`,
 * `restoreHandlers` and `listHandlers`, on top of the public `getResponse`.
 */
export function createHandlerStore(handlers: readonly unknown[]) {
	const initial = [...handlers];
	let current = [...initial];
	return {
		/** Runtime handlers first, as msw's `server.use` does. */
		use(...added: unknown[]) {
			current = [...added, ...current];
		},
		/** Back to the initial handlers, or to `next` when given (as msw does). */
		resetHandlers(...next: unknown[]) {
			current = next.length > 0 ? [...next] : [...initial];
		},
		/** Makes the `once` handlers that already answered answer again. */
		restoreHandlers() {
			for (const handler of current)
				(handler as { isUsed?: boolean }).isUsed = false;
		},
		listHandlers: (): readonly unknown[] => current,
	};
}

export type HandlerStore = ReturnType<typeof createHandlerStore>;

/** The `x-msw-intention` header msw's `passthrough()` and `bypass()` set. */
const INTENTION = 'x-msw-intention';

/**
 * Asks the handlers for a response with msw's public `getResponse`. Resolves
 * `undefined` when no handler matches (an unhandled request), and `null` when
 * the matching handler called `passthrough()`: either way the caller sends the
 * request for real, but only the first is "unhandled".
 */
export async function answer(
	handlers: readonly unknown[],
	request: Request,
): Promise<Response | null | undefined> {
	// `as never`: msw 2 and 3 name their handler types differently.
	const response = await getResponse(handlers as never, request.clone());
	if (!response) return;
	if (response.headers.get(INTENTION) === 'passthrough') return null;
	return response;
}

/**
 * Whether a request is one `bypass(request)` marked (a resolver fetching the
 * real thing): it skips the handlers, and the marker is stripped before it is
 * sent.
 */
export function unmarkBypass(request: Request): Request | undefined {
	if (request.headers.get(INTENTION) !== 'bypass') return;
	const headers = new Headers(request.headers);
	headers.delete(INTENTION);
	return new Request(request, { headers });
}

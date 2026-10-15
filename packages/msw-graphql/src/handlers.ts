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
				if ('isUsed' in (handler as object))
					(handler as { isUsed: boolean }).isUsed = false;
		},
		listHandlers: (): readonly unknown[] => current,
	};
}

export type HandlerStore = ReturnType<typeof createHandlerStore>;

/** The `x-msw-intention` header msw's `passthrough()` sets on its response. */
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
 * real thing): it skips the handlers. msw's `bypass()` appends `msw/passthrough`
 * to the request's `accept` header; the token is stripped before the request is
 * sent, the way msw's own `deleteRequestPassthroughHeader` does.
 */
export function unmarkBypass(request: Request): Request | undefined {
	const accept = request.headers.get('accept');
	if (!accept?.includes('msw/passthrough')) return;
	const headers = new Headers(request.headers);
	const next = accept.replace(/(,\s+)?msw\/passthrough/, '');
	if (next) headers.set('accept', next);
	else headers.delete('accept');
	return new Request(request, { headers });
}

/**
 * The caller's `fetch` init without what a `Request` already carries (body,
 * headers, method), so it can ride along as the second argument and keep
 * Bun's extra options (`unix`, `tls`, `proxy`...).
 */
export function extraInit(init?: RequestInit): RequestInit | undefined {
	if (!init) return;
	const { body, headers, method, ...extra } = init;
	return extra;
}

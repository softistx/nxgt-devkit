/** The request header that carries a mock scope. */
export const SCOPE_HEADER = 'x-mock-scope';

/** What a scope may be: a short token (a worker index, a test id). */
export const isScope = (value: unknown): value is string =>
	typeof value === 'string' && /^[\w.:-]{1,64}$/.test(value);

/** The scope a request carries in `x-mock-scope`, or undefined (absent or invalid). */
export function scopeOf(request: Request): string | undefined {
	const value = request.headers.get(SCOPE_HEADER);
	return isScope(value) ? value : undefined;
}

type Storage = {
	run<R>(store: string, fn: () => R): R;
	getStore(): string | undefined;
};

// AsyncLocalStorage, loaded without a static `node:async_hooks` import so the
// main entry stays importable in a browser bundle. Where it is missing
// (a browser, an old runtime) `withScope` just runs the function.
const storage: Storage | undefined = (() => {
	try {
		const load = (
			globalThis as {
				process?: { getBuiltinModule?: (id: string) => unknown };
			}
		).process?.getBuiltinModule;
		const hooks = load?.('node:async_hooks') as
			| { AsyncLocalStorage: new () => Storage }
			| undefined;
		return hooks ? new hooks.AsyncLocalStorage() : undefined;
	} catch {
		return undefined;
	}
})();

/**
 * Runs `fn` with `scope` as the current mock scope: the executor and the
 * override handlers read it for every API call made inside (awaits included),
 * so an app forwards its incoming request's scope to its server-side API calls
 * without threading it through its code.
 *
 * ```ts
 * return withScope(scopeOf(request), () => handleRequest(request));
 * ```
 *
 * Two rules to know: `withScope(undefined, fn)` inside an outer `withScope`
 * keeps the outer scope (it does not clear it), and the current scope wins
 * over a call's own `x-mock-scope` header.
 */
export function withScope<R>(scope: string | undefined, fn: () => R): R {
	return storage && scope !== undefined ? storage.run(scope, fn) : fn();
}

/** The scope set by the enclosing {@link withScope}, if any. */
export const currentScope = (): string | undefined => storage?.getStore();

/**
 * The scope of an API call: the one `withScope` set, else the one the call's
 * own request carries in `x-mock-scope`.
 */
export const scopeOfCall = (request: Request): string | undefined =>
	currentScope() ?? scopeOf(request);

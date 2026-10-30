import { currentScope } from './scope';

// One store per scope; the default scope (no `withScope`, no header) is "".
const stores = new Map<string, Map<object, unknown>>();

const storeOf = (scope: string): Map<object, unknown> => {
	let store = stores.get(scope);
	if (!store) {
		store = new Map();
		stores.set(scope, store);
	}
	return store;
};

/**
 * Drops the state `scoped`, `scopedValue` and `scopedCounter` hold for one
 * scope, or for every scope (the default one, `""`, included) when called with
 * none. The next access recreates it from its `make` / `initial`. It also
 * frees the stores of scopes that will not come back, which otherwise live as
 * long as the process.
 *
 * ```ts
 * createMockControl({
 *   server,
 *   reset: (ctx) => clearScopedState(ctx?.scope), // scoped reset: one scope; unscoped: all
 * });
 * ```
 *
 * Where `withScope` is a no-op (a browser), every scope is `""`.
 */
export function clearScopedState(scope?: string): void {
	if (scope === undefined) stores.clear();
	else stores.delete(scope);
}

function instanceOf<T>(slot: object, make: () => T): T {
	const store = storeOf(currentScope() ?? '');
	if (!store.has(slot)) store.set(slot, make());
	return store.get(slot) as T;
}

/**
 * A mutable object (a `Map`, a `Set`, an array, a record) with one instance
 * per mock scope, created by `make` the first time a scope touches it. Use it
 * exactly as the object itself: it is a `Proxy` that resolves
 * {@link currentScope} on every access. A call with no scope uses the default
 * scope, `""`.
 *
 * ```ts
 * const students = scoped(() => new Map<string, Student>());
 * students.set('1', ada); // only the current scope's map changes
 * ```
 *
 * Replacing the whole value is not possible through a proxy: use
 * {@link scopedValue} for a scalar or an array that is reassigned.
 */
export function scoped<T extends object>(make: () => T): T {
	const slot = {};
	const current = () => instanceOf(slot, make);
	return new Proxy({} as T, {
		get(_, key) {
			const target = current();
			const value = Reflect.get(target, key, target);
			return typeof value === 'function' ? value.bind(target) : value;
		},
		set: (_, key, value) => Reflect.set(current(), key, value),
		has: (_, key) => Reflect.has(current(), key),
		deleteProperty: (_, key) => Reflect.deleteProperty(current(), key),
		ownKeys: () => Reflect.ownKeys(current()),
		getOwnPropertyDescriptor(_, key) {
			const descriptor = Reflect.getOwnPropertyDescriptor(current(), key);
			return descriptor && { ...descriptor, configurable: true };
		},
	});
}

/**
 * A value (a flag, a counter, a replaced array) with one slot per mock scope,
 * initialised by `initial` the first time a scope reads it.
 *
 * ```ts
 * const lastId = scopedValue(() => 0);
 * lastId.set(lastId.get() + 1);
 * ```
 */
export function scopedValue<T>(initial: () => T): {
	get: () => T;
	set: (value: T) => void;
} {
	const slot = {};
	return {
		get: () => instanceOf(slot, initial),
		set: (value: T) => {
			storeOf(currentScope() ?? '').set(slot, value);
		},
	};
}

/**
 * A counter with one count per mock scope: `next()` returns the new count
 * (1, 2, …), `reset()` puts the current scope's count back to 0 (the current
 * scope only; {@link clearScopedState} clears the others).
 *
 * ```ts
 * const ids = scopedCounter();
 * ids.next(); // 1
 * ```
 */
export function scopedCounter(): { next: () => number; reset: () => void } {
	const count = scopedValue(() => 0);
	return {
		next: () => {
			const n = count.get() + 1;
			count.set(n);
			return n;
		},
		reset: () => count.set(0),
	};
}

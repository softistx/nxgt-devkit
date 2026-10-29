import { isScope } from '../scope';
import { type MockState, mockState, scopeState } from '../state';
import { closeStreams } from '../subscription';
import { handleControl } from './handle';
import {
	type Override,
	overrideHandler,
	overrideProblem,
	scopedOverrideHandler,
} from './override';
import { isProduction, UnknownScenarioError } from './shared';

export type { Override } from './override';
export { UnknownScenarioError } from './shared';

/** The part of an msw server (node or worker) the control needs. */
// `any` handlers: msw 2 and 3 name their handler types differently.
export type ControlServer = {
	use: (...handlers: any[]) => void;
	resetHandlers: () => void;
};

/** What a scoped call hands the app's `reset` and scenarios as their last argument. */
export type ScopeContext = { scope: string };

export type Scenarios = Record<
	string,
	(args?: any, context?: ScopeContext) => unknown
>;

export type MockControlOptions = {
	server: ControlServer;
	/**
	 * The app's reseed. Called by `reset()`, nothing else is. A scoped reset
	 * (`control.scope(id).reset()`) passes `{ scope }`: reseed that scope only.
	 */
	reset?: (context?: ScopeContext) => unknown;
	/** Named app states, run by name with optional JSON arguments. */
	scenarios?: Scenarios;
	/** Where `/reset` etc. are mounted. Defaults to `/__mocks`. */
	path?: string;
	state?: MockState;
};

/** The methods of one mock scope (or of the whole process): see {@link createMockControl}. */
export type MockControlMethods = {
	readonly failing: number | null;
	reset(): Promise<void>;
	fail(status: number | null): void;
	scenario(name: string, args?: unknown): Promise<void>;
	override(...overrides: Override[]): void;
};

/**
 * The control channel of the mocks: `reset`, `fail`, `scenario` and `override`
 * as methods, and `handle(request)` to mount them over HTTP (see
 * `handleControl`). Dev and test only: it throws under `NODE_ENV=production`.
 *
 * `scope(id)` returns the same methods acting on one scope only, so parallel
 * workers do not reset each other's mocks; `handle` picks the scope from the
 * request's `x-mock-scope` header.
 */
export function createMockControl(options: MockControlOptions) {
	if (isProduction()) {
		throw new Error(
			'createMockControl is dev and test only: NODE_ENV is "production". Import the mocks behind your mocks flag.',
		);
	}
	const { server, scenarios = {}, state = mockState } = options;

	function methods(scope?: string): MockControlMethods {
		return {
			/** The status every call answers while the API is made to fail. */
			get failing() {
				return scope === undefined
					? state.failing
					: (state.scopes.get(scope)?.failing ?? null);
			},
			/**
			 * Back to the start: no forced failure, no live event stream, the initial handlers, then the
			 * app's own reset — nothing else (its sessions, say, are its business).
			 * Scoped: only this scope's failure, overrides and streams, then the app's reset with `{ scope }`.
			 */
			async reset() {
				if (scope === undefined) {
					state.failing = null;
					state.scopes.clear();
					closeStreams(state);
					server.resetHandlers();
					await options.reset?.();
					return;
				}
				const own = scopeState(state, scope);
				own.failing = null;
				own.overrides = [];
				closeStreams(state, scope);
				await options.reset?.({ scope });
			},
			/** Every API call answers `status` (503 without a body); `null` ends it. */
			fail(status: number | null) {
				if (scope === undefined) state.failing = status;
				else scopeState(state, scope).failing = status;
			},
			/** Runs a registered scenario by name. Throws `UnknownScenarioError`. */
			async scenario(name: string, args?: unknown) {
				const run = Object.hasOwn(scenarios, name)
					? scenarios[name]
					: undefined;
				if (!run) throw new UnknownScenarioError(name, Object.keys(scenarios));
				if (scope === undefined) await run(args);
				else await run(args, { scope });
			},
			/** A static answer for each operation, until the next reset. */
			override(...overrides: Override[]) {
				for (const override of overrides) {
					const problem = overrideProblem(override);
					if (problem) throw new TypeError(problem);
				}
				if (scope === undefined) {
					for (const override of overrides)
						server.use(overrideHandler(override, state));
					return;
				}
				const own = scopeState(state, scope);
				for (const override of overrides)
					own.overrides.push({ override, used: false });
				if (!own.registered) {
					own.registered = true;
					server.use(scopedOverrideHandler(scope, state));
				}
			},
		};
	}

	const control = {
		...methods(),
		// A getter does not survive a spread: keep it live.
		get failing() {
			return state.failing;
		},
		/**
		 * The same methods acting on one mock scope: its own forced failure, overrides and
		 * event streams, answered only to calls that carry that scope (`withScope`, or the
		 * `x-mock-scope` header). Throws `TypeError` for an invalid scope.
		 */
		scope(id: string): MockControlMethods {
			if (!isScope(id))
				throw new TypeError(
					`A mock scope is 1-64 characters of letters, digits and _ . : - (got ${JSON.stringify(id)}).`,
				);
			return methods(id);
		},
		/** The HTTP face: a `Response`, or null when the path is not the control's. */
		handle: (request: Request): Promise<Response | null> =>
			handleControl(control, options.path ?? '/__mocks', request),
	};
	return control;
}

export type MockControl = ReturnType<typeof createMockControl>;

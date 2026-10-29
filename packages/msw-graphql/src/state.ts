import type { Override } from './control/override';
import type { MockStream } from './subscription';

/** An override of one scope; `used` is set when a `once` override has answered. */
export type ScopedOverride = { override: Override; used: boolean };

/** What one mock scope holds apart from the others (see `control.scope(id)`). */
export type ScopeState = {
	failing: number | null;
	overrides: ScopedOverride[];
	/** Whether this scope's override handler is registered with the server. */
	registered: boolean;
};

/**
 * What the executor and the control channel share. One object rather than two
 * module variables, so a test can build an executor and a control around its
 * own and nothing leaks between them.
 */
export type MockState = {
	/** The status every call answers while the API is made to fail, else null. */
	failing: number | null;
	/** The event streams being served (subscriptions), ended by `closeStreams`. */
	streams: Set<MockStream>;
	/** The state of each mock scope; empty unless the control is driven with a scope. */
	scopes: Map<string, ScopeState>;
};

export function createMockState(): MockState {
	return { failing: null, streams: new Set(), scopes: new Map() };
}

/**
 * The state an executor and a control use when none is passed. Mocks are
 * process-global (one msw server per process), so one default is the honest
 * shape: `createExecutor` and `createMockControl` meet without being wired.
 */
export const mockState: MockState = createMockState();

/** The forced status for a call of `scope`: its own, else the global one. */
export const failingFor = (
	state: MockState,
	scope: string | undefined,
): number | null =>
	(scope === undefined ? undefined : state.scopes.get(scope)?.failing) ??
	state.failing;

/** The state of `scope`, created on first use. */
export function scopeState(state: MockState, scope: string): ScopeState {
	let found = state.scopes.get(scope);
	if (!found) {
		found = { failing: null, overrides: [], registered: false };
		state.scopes.set(scope, found);
	}
	return found;
}

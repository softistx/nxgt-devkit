import type { MockStream } from './subscription';

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
};

export function createMockState(): MockState {
	return { failing: null, streams: new Set() };
}

/**
 * The state an executor and a control use when none is passed. Mocks are
 * process-global (one msw server per process), so one default is the honest
 * shape: `createExecutor` and `createMockControl` meet without being wired.
 */
export const mockState: MockState = createMockState();

import { type MockState, mockState } from '../state';
import { closeStreams } from '../subscription';
import { handleControl } from './handle';
import { type Override, overrideHandler, overrideProblem } from './override';
import { isProduction, UnknownScenarioError } from './shared';

export type { Override } from './override';
export { UnknownScenarioError } from './shared';

/** The part of an msw server (node or worker) the control needs. */
// `any` handlers: msw 2 and 3 name their handler types differently.
export type ControlServer = {
	use: (...handlers: any[]) => void;
	resetHandlers: () => void;
};

export type Scenarios = Record<string, (args?: any) => unknown>;

export type MockControlOptions = {
	server: ControlServer;
	/** The app's reseed. Called by `reset()`, nothing else is. */
	reset?: () => unknown;
	/** Named app states, run by name with optional JSON arguments. */
	scenarios?: Scenarios;
	/** Where `/reset` etc. are mounted. Defaults to `/__mocks`. */
	path?: string;
	state?: MockState;
};

/**
 * The control channel of the mocks: `reset`, `fail`, `scenario` and `override`
 * as methods, and `handle(request)` to mount them over HTTP (see
 * `handleControl`). Dev and test only: it throws under `NODE_ENV=production`.
 */
export function createMockControl(options: MockControlOptions) {
	if (isProduction()) {
		throw new Error(
			'createMockControl is dev and test only: NODE_ENV is "production". Import the mocks behind your mocks flag.',
		);
	}
	const { server, scenarios = {}, state = mockState } = options;

	const control = {
		/** The status every call answers while the API is made to fail. */
		get failing() {
			return state.failing;
		},
		/**
		 * Back to the start: no forced failure, no live event stream, the initial handlers, then the
		 * app's own reset — nothing else (its sessions, say, are its business).
		 */
		async reset() {
			state.failing = null;
			closeStreams(state);
			server.resetHandlers();
			await options.reset?.();
		},
		/** Every API call answers `status` (503 without a body); `null` ends it. */
		fail(status: number | null) {
			state.failing = status;
		},
		/** Runs a registered scenario by name. Throws `UnknownScenarioError`. */
		async scenario(name: string, args?: unknown) {
			const run = Object.hasOwn(scenarios, name) ? scenarios[name] : undefined;
			if (!run) throw new UnknownScenarioError(name, Object.keys(scenarios));
			await run(args);
		},
		/** A static answer for each operation, until the next reset. */
		override(...overrides: Override[]) {
			for (const override of overrides) {
				const problem = overrideProblem(override);
				if (problem) throw new TypeError(problem);
				server.use(overrideHandler(override, state));
			}
		},
		/** The HTTP face: a `Response`, or null when the path is not the control's. */
		handle: (request: Request): Promise<Response | null> =>
			handleControl(control, options.path ?? '/__mocks', request),
	};
	return control;
}

export type MockControl = ReturnType<typeof createMockControl>;

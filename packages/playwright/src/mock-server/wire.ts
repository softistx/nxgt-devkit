/**
 * The wire types of the mock control channel, copied on purpose from
 * `@nxgt/msw-graphql/control`: this subpath talks HTTP and imports neither
 * msw nor that package, so an app that mocks its API some other way can
 * still use it. `test/e2e/mock-server.pw.ts` drives both packages against
 * each other, so a drift fails there.
 */

/** A static answer for one GraphQL operation (`POST <path>/override`). */
export type ServerOverride = {
	operationName: string;
	status?: number;
	data?: unknown;
	errors?: unknown[];
	once?: boolean;
};

/** The `mockServer` fixture: the control channel, called from the test. */
export type MockServer = {
	/** The app's reseed, handlers back to default, no forced failure. */
	reset(): Promise<void>;
	/** Every API call answers this status until `fail(null)` or a reset. */
	fail(status: number | null): Promise<void>;
	/** Runs a scenario the app registered, by name, with JSON arguments. */
	scenario(name: string, args?: unknown): Promise<void>;
	/** Static answers for operations, until the next reset. */
	use(...overrides: ServerOverride[]): Promise<void>;
};

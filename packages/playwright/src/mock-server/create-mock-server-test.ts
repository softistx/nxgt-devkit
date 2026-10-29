import type {
	APIRequestContext,
	PlaywrightTestArgs,
	PlaywrightTestOptions,
	PlaywrightWorkerArgs,
	PlaywrightWorkerOptions,
	TestType,
} from '@playwright/test';
import type { MockServer, ServerOverride } from './wire';

type Worker = PlaywrightWorkerArgs & PlaywrightWorkerOptions;

export type MockServerFixtures = {
	/** Controls the mocks that live in the app's server process. */
	mockServer: MockServer;
	/** Overrides applied before each test: `test.use({ serverMocks: [...] })`. */
	serverMocks: ServerOverride[];
};

export type MockServerTestOptions = {
	/** Where the app mounts the control channel. Defaults to `/__mocks`. */
	path?: string;
	/**
	 * Scope the server mocks to the worker, so specs can run with `workers > 1`:
	 * the control calls, the `page` and the `request` carry `x-mock-scope:
	 * <workerIndex>`, and the app's control keeps one state per scope. Off by
	 * default: the mocks stay process-global and the headers are not sent.
	 */
	scope?: boolean;
};

/** The header that carries the scope; the same name as `@nxgt/msw-graphql`'s `SCOPE_HEADER`. */
export const SCOPE_HEADER = 'x-mock-scope';

function client(
	request: APIRequestContext,
	path: string,
	scope?: string,
): MockServer {
	const post = async (route: string, data: unknown) => {
		// Always JSON, `reset` included: the control answers 415 to any other POST.
		const response = await request.post(`${path}/${route}`, {
			data,
			headers: {
				'content-type': 'application/json',
				...(scope === undefined ? {} : { [SCOPE_HEADER]: scope }),
			},
		});
		if (!response.ok()) {
			throw new Error(
				`${path}/${route} answered ${response.status()}: ${await response.text()}. ` +
					'Is the control mounted (createMockControl().handle) and NODE_ENV not production?',
			);
		}
	};
	return {
		reset: () => post('reset', {}),
		fail: (status) => post('fail', { status }),
		scenario: (name, args) => post('scenario', { name, args }),
		use: (...overrides) => post('override', overrides),
	};
}

/**
 * Extends a `test` (Playwright's, or `createMswTest(...)`) with `mockServer`,
 * which drives the mocks of an SSR/BFF app's server over HTTP, and the
 * `serverMocks` option. The mocks are reset before and after every test.
 *
 * Server mocks are process-global unless `scope: true`: then each worker's
 * control calls and traffic carry `x-mock-scope: <workerIndex>`, and an app
 * whose control keeps a state per scope (`@nxgt/msw-graphql`'s) can run with
 * `workers > 1`. Without it, run those projects with `workers: 1`.
 *
 * ```ts
 * export const test = createMockServerTest(base, { path: '/__mocks' });
 * ```
 */
export function createMockServerTest<
	T extends PlaywrightTestArgs & PlaywrightTestOptions,
>(
	base: TestType<T, Worker>,
	options: MockServerTestOptions = {},
): TestType<T & MockServerFixtures, Worker> {
	const path = (options.path ?? '/__mocks').replace(/\/$/, '');
	const scoped = options.scope === true;
	const extended = (
		base as TestType<PlaywrightTestArgs & PlaywrightTestOptions, Worker>
	).extend<MockServerFixtures>({
		serverMocks: [[], { option: true }],
		...(scoped && {
			// Every page and request of the test goes out with the worker's scope.
			extraHTTPHeaders: async ({ extraHTTPHeaders }, use, testInfo) => {
				await use({
					...extraHTTPHeaders,
					[SCOPE_HEADER]: String(testInfo.workerIndex),
				});
			},
		}),
		mockServer: [
			async ({ request, serverMocks }, use, testInfo) => {
				const server = client(
					request,
					path,
					scoped ? String(testInfo.workerIndex) : undefined,
				);
				await server.reset();
				try {
					if (serverMocks.length > 0) await server.use(...serverMocks);
					await use(server);
				} finally {
					await server.reset();
				}
			},
			{ auto: true },
		],
	});
	return extended as unknown as TestType<T & MockServerFixtures, Worker>;
}

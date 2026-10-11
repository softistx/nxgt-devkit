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
};

function client(request: APIRequestContext, path: string): MockServer {
	const post = async (route: string, data: unknown) => {
		const response = await request.post(`${path}/${route}`, { data });
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
 * Server mocks are process-global: specs that change them cannot share one
 * app server in parallel. Run those projects with `workers: 1`.
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
	const extended = (
		base as TestType<PlaywrightTestArgs & PlaywrightTestOptions, Worker>
	).extend<MockServerFixtures>({
		serverMocks: [[], { option: true }],
		mockServer: [
			async ({ request, serverMocks }, use) => {
				const server = client(request, path);
				await server.reset();
				if (serverMocks.length > 0) await server.use(...serverMocks);
				await use(server);
				await server.reset();
			},
			{ auto: true },
		],
	});
	return extended as unknown as TestType<T & MockServerFixtures, Worker>;
}

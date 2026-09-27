import {
	defineConfig,
	devices,
	type PlaywrightTestConfig,
	type Project,
} from '@playwright/test';

export type Browser = 'chromium' | 'firefox' | 'webkit' | 'msedge' | 'chrome';

export type AppConfigOptions = {
	/** The dev server's port. `PW_PORT` in the environment wins. */
	port: number;
	/** Default `http://localhost:<port>`. `PW_BASE_URL` in the environment wins. */
	baseURL?: string;
	/** Default `['chromium', 'firefox', 'msedge', 'chrome']`. */
	browsers?: Browser[];
	/**
	 * An auth setup project the browsers depend on. `true` matches
	 * `playwright/config/auth.setup.ts`. Default `false`.
	 */
	setup?: boolean | { testDir?: string; testMatch?: RegExp };
	/**
	 * The server Playwright starts. Default `bun dev -m test --port <port>`,
	 * reused locally, fresh on CI. `false` for a stack that is already up.
	 */
	webServer?: PlaywrightTestConfig['webServer'] | false;
	/** Extra environment for the default web server (`MOCK_AUTH`, …). */
	env?: Record<string, string>;
	/** Default `./playwright/e2e`. */
	testDir?: string;
	/** Default `data-pw`. */
	testIdAttribute?: string;
	/** Merged last, over everything above. */
	overrides?: PlaywrightTestConfig;
};

const BROWSERS: Record<Browser, Project['use']> = {
	chromium: { ...devices['Desktop Chrome'] },
	firefox: { ...devices['Desktop Firefox'] },
	webkit: { ...devices['Desktop Safari'] },
	msedge: { ...devices['Desktop Edge'], channel: 'msedge' },
	chrome: { ...devices['Desktop Chrome'], channel: 'chrome' },
};

/**
 * The configuration every app's `playwright.config.ts` used to spell out:
 *
 * ```ts
 * export default defineAppConfig({ port: 5174, setup: true });
 * ```
 */
export function defineAppConfig(options: AppConfigOptions) {
	const ci = Boolean(process.env.CI);
	const port = Number(process.env.PW_PORT) || options.port;
	const baseURL =
		process.env.PW_BASE_URL || options.baseURL || `http://localhost:${port}`;

	const setup =
		options.setup === true ? {} : options.setup ? options.setup : undefined;
	const projects: Project[] = [];
	if (setup) {
		projects.push({
			name: 'setup',
			// Its own folder, matched by name: `playwright.setup.ts` shares the
			// `.setup.ts` suffix and must not run as a setup project.
			testDir: setup.testDir ?? './playwright/config',
			testMatch: setup.testMatch ?? /auth\.setup\.ts$/,
		});
	}
	for (const browser of options.browsers ?? [
		'chromium',
		'firefox',
		'msedge',
		'chrome',
	]) {
		projects.push({
			name: browser,
			use: BROWSERS[browser],
			...(setup ? { dependencies: ['setup'] } : {}),
		});
	}

	const webServer =
		options.webServer === false
			? undefined
			: (options.webServer ?? {
					command: `bun dev -m test --port ${port}`,
					url: baseURL,
					reuseExistingServer: !ci,
					...(options.env ? { env: options.env } : {}),
				});

	return defineConfig(
		{
			testDir: options.testDir ?? './playwright/e2e',
			expect: { timeout: 15_000 },
			fullyParallel: true,
			forbidOnly: ci,
			retries: ci ? 2 : 0,
			workers: ci ? 1 : undefined,
			reporter: 'html',
			projects,
			...(webServer ? { webServer } : {}),
			use: {
				testIdAttribute: options.testIdAttribute ?? 'data-pw',
				baseURL,
				trace: 'on-first-retry',
				video: 'on-first-retry',
				screenshot: 'only-on-failure',
			},
		},
		options.overrides ?? {},
	);
}

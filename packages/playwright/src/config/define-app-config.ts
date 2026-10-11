import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
	defineConfig,
	devices,
	type PlaywrightTestConfig,
	type Project,
} from '@playwright/test';
import {
	DEFAULT_SCREENS_DIR,
	SCREENS_METADATA_KEY,
	type ScreensMetadata,
} from '../screens/dir';
import { selectedProjects } from './selected-projects';

export type Browser = 'chromium' | 'firefox' | 'webkit' | 'msedge' | 'chrome';

/**
 * A name from Playwright's `devices` (`'Pixel 7'`, `'iPhone 14'`, …), without
 * the index signature its type carries, so a typo is a type error.
 */
export type DeviceName = keyof {
	[K in keyof typeof devices as string extends K
		? never
		: number extends K
			? never
			: K]: unknown;
};

/** One phone project: a device name, or a device under a name of your own. */
export type MobileProject = DeviceName | { device: DeviceName; name: string };

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
	 * Phone projects, added after the desktop ones whatever `browsers` holds.
	 * `true` is `['Pixel 7']`, on Chromium. Each device runs in its own
	 * browser (`iPhone 14` needs WebKit installed) and is named
	 * `mobile-<browser>`; two devices on one browser need `{ device, name }`.
	 * Default `false`.
	 */
	mobile?: boolean | MobileProject[];
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
	/**
	 * Full-page screens saved by `saveScreen` (`@nxgt/playwright/screens`) on
	 * a run whose `env` variable (default `SCREENS`) is `1`: the folder `dir`
	 * (default `./playwright/screenshots`, relative to the config) is emptied
	 * first by a global setup, and each screen saved under
	 * `<dir>/<project>/`. `true` takes both defaults. Default `false`.
	 */
	screens?: boolean | { dir?: string; env?: string };
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
 * The phone projects `mobile` asks for, each named `mobile-<browser>` unless
 * it was given a name. Throws on a name that is not one of Playwright's
 * devices, or a device that is not a phone or tablet.
 */
export function mobileProjects(
	mobile: AppConfigOptions['mobile'],
): { name: string; device: DeviceName }[] {
	if (!mobile) return [];
	const list: MobileProject[] = mobile === true ? ['Pixel 7'] : mobile;
	return list.map((entry) => {
		const device = typeof entry === 'string' ? entry : entry.device;
		const descriptor = (devices as Record<string, (typeof devices)[string]>)[
			device
		];
		if (!descriptor) {
			throw new Error(
				`defineAppConfig: "${device}" is not one of Playwright's devices. ` +
					"See `devices` in @playwright/test for the names, such as 'Pixel 7' or 'iPhone 14'.",
			);
		}
		if (!descriptor.isMobile) {
			throw new Error(
				`defineAppConfig: "${device}" is not a mobile device. Add a desktop ` +
					'browser through `browsers`, or a custom project through `overrides`.',
			);
		}
		return {
			name:
				typeof entry === 'string'
					? `mobile-${descriptor.defaultBrowserType}`
					: entry.name,
			device,
		};
	});
}

/**
 * The global setup that empties the screens folder: `dist/screens/clear.js`
 * from the build (an entry point of its own, one folder below `dist` like
 * this module and the chunks it may be bundled into), `src/screens/clear.ts`
 * from the sources.
 */
export function clearScreensSetup(): string {
	const extension = import.meta.url.endsWith('.ts') ? 'ts' : 'js';
	const path = fileURLToPath(
		new URL(`../screens/clear.${extension}`, import.meta.url),
	);
	if (!existsSync(path)) {
		throw new Error(
			`defineAppConfig: the screens' global setup is missing at ${path}. ` +
				'Reinstall @nxgt/playwright.',
		);
	}
	return path;
}

/** The `screens` option, as the config's metadata and global setup. */
export function screensConfig(
	screens: AppConfigOptions['screens'],
	env: NodeJS.ProcessEnv = process.env,
): Pick<PlaywrightTestConfig, 'metadata' | 'globalSetup'> {
	if (!screens) return {};
	const { dir = DEFAULT_SCREENS_DIR, env: variable = 'SCREENS' } =
		screens === true ? {} : screens;
	const metadata: ScreensMetadata = { dir, enabled: env[variable] === '1' };
	return {
		metadata: { [SCREENS_METADATA_KEY]: metadata },
		...(metadata.enabled ? { globalSetup: clearScreensSetup() } : {}),
	};
}

/**
 * The configuration every app's `playwright.config.ts` used to spell out:
 *
 * ```ts
 * export default defineAppConfig({ port: 5174, setup: true });
 * ```
 */
export function defineAppConfig(options: AppConfigOptions) {
	const ci = Boolean(process.env.CI);
	// For the workers, which load this config without the command line.
	selectedProjects();
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
	for (const { name, device } of mobileProjects(options.mobile)) {
		// Only a mobile project's name is checked: a repeated desktop browser
		// was accepted before `mobile` existed, and still is.
		if (projects.some((project) => project.name === name)) {
			throw new Error(
				`defineAppConfig: two projects are named "${name}". ` +
					"Give a mobile device a name of its own: { device: 'Pixel 5', name: 'mobile-pixel-5' }.",
			);
		}
		projects.push({
			name,
			use: { ...devices[device] },
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

	const screens = screensConfig(options.screens);
	// `defineConfig` replaces `metadata` wholesale: an app's own keys must not
	// drop the screens' entry the workers read.
	const overrides: PlaywrightTestConfig =
		screens.metadata && options.overrides?.metadata
			? {
					...options.overrides,
					metadata: { ...screens.metadata, ...options.overrides.metadata },
				}
			: (options.overrides ?? {});

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
			...screens,
			use: {
				testIdAttribute: options.testIdAttribute ?? 'data-pw',
				baseURL,
				trace: 'on-first-retry',
				video: 'on-first-retry',
				screenshot: 'only-on-failure',
			},
		},
		overrides,
	);
}

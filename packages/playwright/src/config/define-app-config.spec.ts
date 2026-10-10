import { afterEach, describe, expect, test } from 'bun:test';
import { defineAppConfig } from './define-app-config';

// Playwright's `defineConfig` normalises `webServer` to an array.
const server = (config: ReturnType<typeof defineAppConfig>) =>
	([] as unknown[]).concat(config.webServer ?? [])[0];

const ENV = { ...process.env };
afterEach(() => {
	process.env = { ...ENV };
});

describe('defineAppConfig', () => {
	test('serves the app on its port with the shared defaults', () => {
		delete process.env.CI;
		delete process.env.PW_PORT;
		delete process.env.PW_BASE_URL;
		const config = defineAppConfig({ port: 5174 });
		expect(config.use?.baseURL).toBe('http://localhost:5174');
		expect(config.use?.testIdAttribute).toBe('data-pw');
		expect(server(config)).toMatchObject({
			command: 'bun dev -m test --port 5174',
			reuseExistingServer: true,
		});
		expect(config.projects?.map((p) => p.name)).toEqual([
			'chromium',
			'firefox',
			'msedge',
			'chrome',
		]);
		expect(config.retries).toBe(0);
	});

	test('PW_PORT and PW_BASE_URL win over the options', () => {
		process.env.PW_PORT = '6000';
		process.env.PW_BASE_URL = 'http://app.localhost:6000';
		const config = defineAppConfig({ port: 5174 });
		expect(config.use?.baseURL).toBe('http://app.localhost:6000');
		expect(server(config)).toMatchObject({
			command: 'bun dev -m test --port 6000',
		});
	});

	test('on CI: retries, one worker, a fresh server, no .only', () => {
		process.env.CI = '1';
		const config = defineAppConfig({ port: 5174 });
		expect(config.retries).toBe(2);
		expect(config.workers).toBe(1);
		expect(config.forbidOnly).toBe(true);
		expect(server(config)).toMatchObject({ reuseExistingServer: false });
	});

	test('setup: a setup project every browser depends on', () => {
		const config = defineAppConfig({
			port: 5174,
			setup: true,
			browsers: ['chromium'],
		});
		expect(config.projects?.[0]).toMatchObject({
			name: 'setup',
			testDir: './playwright/config',
		});
		expect(String(config.projects?.[0]?.testMatch)).toBe(
			'/auth\\.setup\\.ts$/',
		);
		expect(config.projects?.[1]).toMatchObject({
			name: 'chromium',
			dependencies: ['setup'],
		});
	});

	test('webServer: false for a stack that is already up; env for the default one', () => {
		expect(
			server(defineAppConfig({ port: 1, webServer: false })),
		).toBeUndefined();
		expect(
			server(defineAppConfig({ port: 1, env: { MOCK_AUTH: 'true' } })),
		).toMatchObject({ env: { MOCK_AUTH: 'true' } });
	});

	test('mobile: true adds a Pixel 7 on Chromium after the desktop browsers', () => {
		const config = defineAppConfig({
			port: 1,
			browsers: ['firefox'],
			mobile: true,
		});
		expect(config.projects?.map((p) => p.name)).toEqual([
			'firefox',
			'mobile-chromium',
		]);
		expect(config.projects?.[1]?.use).toMatchObject({
			defaultBrowserType: 'chromium',
			isMobile: true,
			hasTouch: true,
			viewport: { width: 412 },
		});
	});

	test('mobile: off by default, and false adds nothing', () => {
		for (const mobile of [undefined, false]) {
			const config = defineAppConfig({
				port: 1,
				browsers: ['chromium'],
				mobile,
			});
			expect(config.projects?.map((p) => p.name)).toEqual(['chromium']);
		}
	});

	test('mobile: each device on its own browser, named after it', () => {
		const config = defineAppConfig({
			port: 1,
			browsers: [],
			mobile: ['Pixel 7', 'iPhone 14'],
		});
		expect(config.projects?.map((p) => p.name)).toEqual([
			'mobile-chromium',
			'mobile-webkit',
		]);
		expect(config.projects?.[1]?.use).toMatchObject({
			defaultBrowserType: 'webkit',
			isMobile: true,
		});
	});

	test('mobile: depends on the setup project like the desktop browsers', () => {
		const config = defineAppConfig({
			port: 1,
			setup: true,
			browsers: ['chromium'],
			mobile: true,
		});
		expect(config.projects?.map((p) => [p.name, p.dependencies ?? []])).toEqual(
			[
				['setup', []],
				['chromium', ['setup']],
				['mobile-chromium', ['setup']],
			],
		);
	});

	test('mobile: two devices on one browser need a name of their own', () => {
		expect(() =>
			defineAppConfig({ port: 1, mobile: ['Pixel 7', 'Pixel 5'] }),
		).toThrow('two projects are named "mobile-chromium"');
		const config = defineAppConfig({
			port: 1,
			browsers: [],
			mobile: ['Pixel 7', { device: 'Pixel 5', name: 'mobile-pixel-5' }],
		});
		expect(config.projects?.map((p) => p.name)).toEqual([
			'mobile-chromium',
			'mobile-pixel-5',
		]);
	});

	test('mobile: a name a desktop project already has is refused', () => {
		expect(() =>
			defineAppConfig({
				port: 1,
				browsers: ['chromium'],
				mobile: [{ device: 'Pixel 7', name: 'chromium' }],
			}),
		).toThrow('two projects are named "chromium"');
	});

	test('mobile: an unknown or desktop device is refused', () => {
		expect(() =>
			// @ts-expect-error not one of Playwright's devices
			defineAppConfig({ port: 1, mobile: ['Pixel 99'] }),
		).toThrow('"Pixel 99" is not one of Playwright\'s devices');
		expect(() =>
			defineAppConfig({ port: 1, mobile: ['Desktop Firefox'] }),
		).toThrow('"Desktop Firefox" is not a mobile device');
	});

	test('mobile: overrides still amend a mobile project by name', () => {
		const config = defineAppConfig({
			port: 1,
			browsers: [],
			mobile: true,
			overrides: {
				projects: [{ name: 'mobile-chromium', use: { locale: 'fr-FR' } }],
			},
		});
		expect(config.projects?.map((p) => p.name)).toEqual(['mobile-chromium']);
		expect(config.projects?.[0]?.use).toMatchObject({
			locale: 'fr-FR',
			isMobile: true,
		});
	});

	test('overrides are merged last', () => {
		const config = defineAppConfig({ port: 1, overrides: { timeout: 90_000 } });
		expect(config.timeout).toBe(90_000);
	});
});

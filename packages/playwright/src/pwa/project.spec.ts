import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { defineAppConfig } from '../config/define-app-config';
import { PROJECTS_ENV } from '../config/selected-projects';
import { isPwaRun, pwaProject } from './project';

const server = (config: ReturnType<typeof defineAppConfig>) =>
	([] as unknown[]).concat(config.webServer ?? []) as Record<string, unknown>[];

// `defineAppConfig` reads `process.env` too: a `PW_PORT` exported for the e2e
// suite (two worktrees at once) must not move the ports these specs expect.
const ENV = { ...process.env };
beforeEach(() => {
	delete process.env.CI;
	delete process.env.PW_PORT;
	delete process.env.PW_BASE_URL;
});
afterEach(() => {
	process.env = { ...ENV };
});

describe('pwaProject', () => {
	test('a production build on its port, one Chromium project, nothing else', () => {
		const config = defineAppConfig(pwaProject({ port: 5274 }, {}));
		expect(config.use?.baseURL).toBe('http://localhost:5274');
		expect(server(config)).toEqual([
			{
				command: 'bun run build && bun run start',
				url: 'http://localhost:5274/',
				env: { PORT: '5274' },
				reuseExistingServer: true,
				timeout: 180_000,
			},
		]);
		expect(config.projects).toHaveLength(1);
		expect(config.projects?.[0]).toMatchObject({
			name: 'pwa',
			testDir: './playwright/pwa',
			use: { defaultBrowserType: 'chromium', serviceWorkers: 'allow' },
		});
		expect(config.projects?.[0]?.dependencies).toBeUndefined();
	});

	test('PW_PORT and CI move the server like defineAppConfig', () => {
		const options = pwaProject({ port: 5274 }, { PW_PORT: '6100', CI: '1' });
		expect(options.port).toBe(6100);
		expect(options.webServer).toMatchObject({
			url: 'http://localhost:6100/',
			env: { PORT: '6100' },
			reuseExistingServer: false,
		});
	});

	test('its options: name, folder, commands, ready path, env, server and use', () => {
		const options = pwaProject(
			{
				port: 4000,
				name: 'offline',
				testDir: './e2e/pwa',
				build: false,
				start: 'node server.js',
				readyPath: 'manifest.webmanifest',
				env: { LOG_LEVEL: 'warn', PORT: 'ignored' },
				webServer: { stderr: 'ignore', timeout: 60_000, env: { DEBUG: '1' } },
				use: { locale: 'fr-CA' },
			},
			{},
		);
		expect(options.webServer).toEqual({
			command: 'node server.js',
			url: 'http://localhost:4000/manifest.webmanifest',
			env: { LOG_LEVEL: 'warn', DEBUG: '1', PORT: '4000' },
			reuseExistingServer: true,
			timeout: 60_000,
			stderr: 'ignore',
		});
		expect(options.overrides?.projects?.[0]).toMatchObject({
			name: 'offline',
			testDir: './e2e/pwa',
			use: { locale: 'fr-CA', serviceWorkers: 'allow' },
		});
	});

	test('overrides are kept, their projects after the preset', () => {
		const config = defineAppConfig(
			pwaProject(
				{
					port: 1,
					overrides: {
						workers: 1,
						projects: [{ name: 'pwa-firefox', testDir: './playwright/pwa' }],
					},
				},
				{},
			),
		);
		expect(config.workers).toBe(1);
		expect(config.projects?.map((p) => p.name)).toEqual(['pwa', 'pwa-firefox']);
	});
});

describe('isPwaRun', () => {
	test('--project pwa, in the runner and then in a worker', () => {
		const env: NodeJS.ProcessEnv = {};
		expect(isPwaRun({}, ['test', '--project=pwa'], env)).toBe(true);
		expect(env[PROJECTS_ENV]).toBe('["pwa"]');
		expect(isPwaRun({}, [], { ...env, TEST_WORKER_INDEX: '0' })).toBe(true);
	});

	test('the environment switch, for UI mode', () => {
		expect(isPwaRun({}, [], { PWA: '1' })).toBe(true);
		expect(isPwaRun({}, [], { PWA: '0' })).toBe(false);
		expect(isPwaRun({}, ['test', '--project', 'chromium'], {})).toBe(false);
	});

	test('another project name and variable', () => {
		expect(
			isPwaRun({ project: 'offline' }, ['test', '--project', 'offline'], {}),
		).toBe(true);
		expect(isPwaRun({ env: 'E2E_PWA' }, [], { E2E_PWA: '1', PWA: '0' })).toBe(
			true,
		);
		expect(isPwaRun({ env: 'E2E_PWA' }, [], { PWA: '1' })).toBe(false);
	});
});

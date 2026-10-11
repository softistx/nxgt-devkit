import { describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FullConfig } from '@playwright/test';
import {
	clearScreensSetup,
	defineAppConfig,
	screensConfig,
} from '../config/define-app-config';
import clearScreens from './clear';
import { screensDir, screensMetadata } from './dir';

const config = (metadata: object, configFile?: string) =>
	({ metadata, configFile, rootDir: '/' }) as unknown as FullConfig;

describe('screensConfig', () => {
	test('off by default: no metadata, no global setup', () => {
		expect(screensConfig(undefined)).toEqual({});
		expect(screensConfig(false)).toEqual({});
	});

	test('true: the default folder, saving only when SCREENS=1', () => {
		expect(screensConfig(true, {})).toEqual({
			metadata: {
				nxgtScreens: { dir: './playwright/screenshots', enabled: false },
			},
		});
		const on = screensConfig(true, { SCREENS: '1' });
		expect(on.metadata).toEqual({
			nxgtScreens: { dir: './playwright/screenshots', enabled: true },
		});
		expect(on.globalSetup).toBe(clearScreensSetup());
	});

	test('a folder and a variable of its own', () => {
		expect(
			screensConfig({ dir: 'shots', env: 'SHOTS' }, { SHOTS: '1' }).metadata,
		).toEqual({ nxgtScreens: { dir: 'shots', enabled: true } });
	});

	test('reaches the config through defineAppConfig', () => {
		const built = defineAppConfig({ port: 5174, screens: { dir: 'shots' } });
		expect(screensMetadata(built as unknown as FullConfig)).toEqual({
			dir: 'shots',
			enabled: process.env.SCREENS === '1',
		});
	});
});

describe('clearScreensSetup', () => {
	test('points at a file that exists', () => {
		expect(existsSync(clearScreensSetup())).toBe(true);
	});
});

describe('screensDir', () => {
	test("resolves against the config file's folder", () => {
		expect(screensDir(config({}, '/app/playwright.config.ts'))).toBe(
			'/app/playwright/screenshots',
		);
		expect(
			screensDir(
				config({ nxgtScreens: { dir: 'shots', enabled: true } }, '/app/pw.ts'),
			),
		).toBe('/app/shots');
	});

	test('an explicit folder wins, an absolute one is kept', () => {
		expect(
			screensDir(
				config({ nxgtScreens: { dir: 'shots' } }, '/app/pw.ts'),
				'other',
			),
		).toBe('/app/other');
		expect(screensDir(config({}, '/app/pw.ts'), '/tmp/x')).toBe('/tmp/x');
	});
});

describe('clearScreens', () => {
	test("empties the run's folder", () => {
		const root = mkdtempSync(join(tmpdir(), 'screens-'));
		const dir = join(root, 'shots', 'chromium');
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'old.png'), '');
		clearScreens(
			config(
				{ nxgtScreens: { dir: 'shots', enabled: true } },
				join(root, 'pw.ts'),
			),
		);
		expect(existsSync(join(root, 'shots'))).toBe(false);
		expect(existsSync(root)).toBe(true);
	});
});

describe('defineAppConfig with metadata of its own', () => {
	test('keeps both the screens entry and the overrides', () => {
		const built = defineAppConfig({
			port: 5174,
			screens: true,
			overrides: { metadata: { build: 42 } },
		});
		expect(built.metadata).toMatchObject({
			build: 42,
			nxgtScreens: { dir: './playwright/screenshots' },
		});
	});
});

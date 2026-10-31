import { describe, expect, test } from 'bun:test';
import type { FullConfig } from '@playwright/test';
import { defineAppConfig } from '../config/define-app-config';
import { clearScreensSetup } from '../config/screens';
import { warmUpSetup } from '../config/warm-up';
import { type WarmUpPage, warmUpPage } from './warm-up';

/** A server that hydrates only from its `hydratesOn`-th request, on a fake clock. */
function fakeServer(hydratesOn: number, tick = 1_000) {
	let clock = 0;
	let loads = 0;
	let loaded = 0;
	const page: WarmUpPage = {
		goto: (async () => {
			loads += 1;
			clock += tick;
			loaded = loads;
			if (loads < hydratesOn) throw new Error('504 Outdated Optimize Dep');
			return null;
		}) as WarmUpPage['goto'],
		waitForFunction: (async (
			_fn: unknown,
			_arg: unknown,
			options?: { timeout?: number },
		) => {
			if (loaded >= hydratesOn) return {};
			clock += options?.timeout ?? 0;
			throw new Error('Timeout exceeded');
		}) as unknown as WarmUpPage['waitForFunction'],
	};
	return { page, now: () => clock, loads: () => loads };
}

const loop = (now: () => number, extra = {}) => ({
	url: 'http://localhost:5174/sign-in',
	marker: 'html[data-hydrated]',
	timeout: 180_000,
	reloadEvery: 15_000,
	now,
	...extra,
});

describe('warmUpPage', () => {
	test('returns at once when the first page hydrates', async () => {
		const server = fakeServer(1);
		await warmUpPage(server.page, loop(server.now));
		expect(server.loads()).toBe(1);
	});

	test('reloads until the page hydrates', async () => {
		const server = fakeServer(4);
		await warmUpPage(server.page, loop(server.now));
		expect(server.loads()).toBe(4);
	});

	test('a function marker is accepted', async () => {
		const server = fakeServer(2);
		await warmUpPage(server.page, loop(server.now, { marker: () => true }));
		expect(server.loads()).toBe(2);
	});

	test('fails with the URL, the timeout and the last error when it never hydrates', async () => {
		const server = fakeServer(Number.POSITIVE_INFINITY);
		const error = await warmUpPage(
			server.page,
			loop(server.now, { timeout: 60_000 }),
		).catch((e: Error) => e);
		expect(error).toBeInstanceOf(Error);
		const message = (error as Error).message;
		expect(message).toContain('http://localhost:5174/sign-in');
		expect(message).toContain('did not hydrate within 60000ms');
		expect(message).toContain('Timeout exceeded');
		// The deadline is checked before each navigation: it stops, not loops on.
		expect(server.loads()).toBeLessThanOrEqual(5);
	});
});

describe('defineAppConfig warmUp', () => {
	test('off by default', () => {
		const config = defineAppConfig({ port: 5174 });
		expect(config.globalSetup).toBeUndefined();
	});

	test('sets the global setup and the metadata', () => {
		const config = defineAppConfig({
			port: 5174,
			warmUp: { path: '/sign-in' },
		});
		expect(config.globalSetup).toBe(warmUpSetup());
		expect(config.metadata).toEqual({ nxgtWarmUp: { path: '/sign-in' } });
	});

	test('chains after the screens one and keeps the app metadata', () => {
		const saved = process.env.SCREENS;
		process.env.SCREENS = '1';
		try {
			const config = defineAppConfig({
				port: 5174,
				screens: true,
				warmUp: true,
				overrides: { metadata: { mine: 1 } },
			});
			expect(config.globalSetup).toEqual([clearScreensSetup(), warmUpSetup()]);
			expect(Object.keys(config.metadata ?? {}).sort()).toEqual([
				'mine',
				'nxgtScreens',
				'nxgtWarmUp',
			]);
		} finally {
			if (saved === undefined) delete process.env.SCREENS;
			else process.env.SCREENS = saved;
		}
	});

	test('the global setup does nothing without the option', async () => {
		const { default: setup } = await import('./setup');
		await setup({ metadata: {}, projects: [] } as unknown as FullConfig);
	});
});

import { describe, expect, test } from 'bun:test';
import { loadAxe, MISSING_AXE } from './scan';

describe('loadAxe', () => {
	test('loads the installed peer', async () => {
		const { AxeBuilder } = await loadAxe();
		expect(typeof AxeBuilder).toBe('function');
	});

	test('a missing peer is named, with the install command', async () => {
		const missing = () =>
			Promise.reject(
				new Error(
					"Cannot find package '@axe-core/playwright' imported from /app/x.js",
				),
			);
		await expect(loadAxe(missing)).rejects.toThrow(MISSING_AXE);
		expect(MISSING_AXE).toContain('bun add -d @axe-core/playwright');
	});

	test('a missing dependency of the peer is not blamed on the peer', async () => {
		const transitive = () =>
			Promise.reject(
				new Error(
					"Cannot find package 'axe-core' imported from /app/node_modules/@axe-core/playwright/dist/index.mjs",
				),
			);
		await expect(loadAxe(transitive)).rejects.toThrow(
			"Cannot find package 'axe-core'",
		);
	});

	test('any other error is rethrown as is', async () => {
		const broken = () => Promise.reject(new Error('boom'));
		await expect(loadAxe(broken)).rejects.toThrow('boom');
	});
});

import { describe, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import { checkScreen } from './check-screen';
import { saveScreen } from './save-screen';

const phone = { width: 390, height: 844 };

/** A page that records its viewport sizes and each call that saw one. */
function fakePage(fail?: 'screenshot') {
	let size: { width: number; height: number } | null = {
		width: 1280,
		height: 720,
	};
	const sizes: Array<{ width: number; height: number } | null> = [];
	const page = {
		viewportSize: () => size,
		setViewportSize: async (next: { width: number; height: number }) => {
			size = next;
			sizes.push(next);
		},
		evaluate: async () => 0,
		screenshot: async () => {
			sizes.push(size);
			if (fail) throw new Error('screenshot failed');
			return Buffer.alloc(0);
		},
	};
	return { page: page as unknown as Page, sizes, current: () => size };
}

const info = (): TestInfo =>
	({
		project: { name: 'chromium' },
		config: { metadata: {}, rootDir: '/', configFile: '/x/pw.ts' },
	}) as unknown as TestInfo;

const dir = mkdtempSync(join(tmpdir(), 'viewport-'));

describe('saveScreen with a viewport', () => {
	test('saves at that size, then restores the previous one', async () => {
		const { page, sizes, current } = fakePage();
		await saveScreen(page, info(), 'list-phone', { dir, viewport: phone });
		expect(sizes).toContainEqual(phone);
		expect(sizes.at(-1)).toEqual({ width: 1280, height: 720 });
		expect(current()).toEqual({ width: 1280, height: 720 });
	});

	test('restores it when the save throws', async () => {
		const { page, current } = fakePage('screenshot');
		await expect(
			saveScreen(page, info(), 'list-phone', { dir, viewport: phone }),
		).rejects.toThrow('screenshot failed');
		expect(current()).toEqual({ width: 1280, height: 720 });
	});

	test('without a viewport the page is left alone', async () => {
		const { page, sizes } = fakePage();
		await saveScreen(page, info(), 'desktop', { dir });
		expect(sizes).not.toContainEqual(phone);
	});
});

describe('checkScreen with a viewport', () => {
	test('runs the checks at that size, then restores the previous one', async () => {
		const { page, current } = fakePage();
		const seen: unknown[] = [];
		await checkScreen(page, info(), 'list-phone', {
			viewport: phone,
			a11y: async (p) => {
				seen.push(p.viewportSize());
			},
			horizontalScroll: false,
		});
		expect(seen).toEqual([phone]);
		expect(current()).toEqual({ width: 1280, height: 720 });
	});

	test('restores it when a check throws', async () => {
		const { page, current } = fakePage();
		await expect(
			checkScreen(page, info(), 'list-phone', {
				viewport: phone,
				a11y: async () => {
					throw new Error('axe failed');
				},
			}),
		).rejects.toThrow('axe failed');
		expect(current()).toEqual({ width: 1280, height: 720 });
	});
});

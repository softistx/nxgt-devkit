import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { checkScreen } from '../../src/screens';
import { SCREENS_METADATA_KEY } from '../../src/screens/dir';

test.use({ viewport: { width: 412, height: 800 } });

const PIXEL =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const doc = (body: string) =>
	`<!doctype html><html lang="en"><head><title>Probe</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main><h1>Probe</h1>${body}</main></body></html>`;
const CLEAN = doc(`<img src="${PIXEL}" alt="A dot">`);
const NO_ALT = doc(`<img id="logo" src="${PIXEL}">`);
const WIDE = doc('<div style="width:900px">wide</div>');
const INNER = doc(
	'<div id="inner" style="overflow-x:auto;width:200px"><div style="width:900px">wide</div></div>',
);

test('a clean page passes', async ({ page }, testInfo) => {
	await page.setContent(CLEAN);
	await checkScreen(page, testInfo, 'clean');
});

test('an image without alt fails with the accessibility message', async ({
	page,
}, testInfo) => {
	await page.setContent(NO_ALT);
	const error = await checkScreen(page, testInfo, 'no-alt').catch(
		(e: Error) => e,
	);
	expect((error as Error).message).toContain('image-alt [critical]');
});

test('an options object reaches expectAccessible', async ({
	page,
}, testInfo) => {
	await page.setContent(NO_ALT);
	await checkScreen(page, testInfo, 'excluded', { a11y: { exclude: '#logo' } });
});

test('a11y: false skips the scan', async ({ page }, testInfo) => {
	await page.setContent(NO_ALT);
	await checkScreen(page, testInfo, 'skipped', { a11y: false });
});

test('a function replaces the scan', async ({ page }, testInfo) => {
	await page.setContent(NO_ALT);
	const seen: unknown[] = [];
	await checkScreen(page, testInfo, 'custom', {
		a11y: async (p) => {
			seen.push(p);
		},
	});
	expect(seen).toEqual([page]);
});

test('a page wider than the viewport fails the sideways-scroll check', async ({
	page,
}, testInfo) => {
	await page.setContent(WIDE);
	const error = await checkScreen(page, testInfo, 'wide').catch(
		(e: Error) => e,
	);
	expect((error as Error).message).toContain('scrolls horizontally');
});

test('horizontalScroll: false skips the check', async ({ page }, testInfo) => {
	await page.setContent(WIDE);
	await checkScreen(page, testInfo, 'wide-ok', { horizontalScroll: false });
});

const CLIPPED = doc(
	'<p id="title" style="width:100px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font:16px monospace">WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW</p>',
);

test('textOverflow: true fails on a clipped text; the default passes the same page', async ({
	page,
}, testInfo) => {
	await page.setContent(CLIPPED);
	await checkScreen(page, testInfo, 'clipped-default');
	const error = await checkScreen(page, testInfo, 'clipped', {
		textOverflow: true,
	}).catch((e: Error) => e);
	expect((error as Error).message).toContain(
		'Text overflows its box in 1 element',
	);
	await checkScreen(page, testInfo, 'clipped-excluded', {
		textOverflow: { exclude: '#title' },
	});
});

const THREE = doc(
	['a', 'b', 'c']
		.map(
			(c) =>
				`<p class="${c}" style="width:100px;overflow:hidden;white-space:nowrap;font:16px monospace">${'W'.repeat(40)}</p>`,
		)
		.join(''),
);

test("checkScreen's max reaches textOverflow, and textOverflow's own max wins", async ({
	page,
}, testInfo) => {
	await page.setContent(THREE);
	const listed = async (options: Parameters<typeof checkScreen>[3]) =>
		(
			(
				(await checkScreen(page, testInfo, 'three', {
					a11y: false,
					...options,
				}).catch((e: Error) => e)) as Error
			).message.split('\n') as string[]
		).filter((l) => l.startsWith('  - ')).length;
	expect(await listed({ textOverflow: true, max: 1 })).toBe(1);
	expect(await listed({ textOverflow: { max: 2 }, max: 1 })).toBe(2);
	expect(await listed({ textOverflow: { max: undefined }, max: 1 })).toBe(1);
});

test('scroller, as a selector or a function of the test, is checked', async ({
	page,
}, testInfo) => {
	await page.setContent(INNER);
	await checkScreen(page, testInfo, 'inner-none');
	const message = async (scroller: Parameters<typeof checkScreen>[3]) =>
		(
			(await checkScreen(page, testInfo, 'inner', scroller).catch(
				(e: Error) => e,
			)) as Error
		).message;
	expect(await message({ scroller: '#inner' })).toContain(
		'The scroll container div#inner scrolls horizontally',
	);
	let given: unknown;
	expect(
		await message({
			scroller: (info) => {
				given = info;
				return '#inner';
			},
		}),
	).toContain('div#inner');
	expect(given).toBe(testInfo);
	await checkScreen(page, testInfo, 'inner-undefined', {
		scroller: () => undefined,
	});
});

test('saves the screen before a failing check', async ({ page }, testInfo) => {
	await page.setContent(NO_ALT);
	// A derived testInfo whose config says saving is on: the run's own SCREENS
	// variable and config stay untouched, and the test needs no SCREENS=1.
	const saving = Object.create(testInfo, {
		config: {
			value: {
				...testInfo.config,
				metadata: { [SCREENS_METADATA_KEY]: { dir: 'unused', enabled: true } },
			},
		},
	});
	const dir = testInfo.outputPath('screens');
	const error = await checkScreen(page, saving, 'failing', {
		save: { dir },
	}).catch((e: Error) => e);
	expect((error as Error).message).toContain('image-alt');
	expect(existsSync(join(dir, testInfo.project.name, 'failing.png'))).toBe(
		true,
	);
});

test('saves nothing when the run does not save screens', async ({
	page,
}, testInfo) => {
	await page.setContent(CLEAN);
	const dir = testInfo.outputPath('screens');
	await checkScreen(page, testInfo, 'quiet', { save: { dir } });
	if (process.env.SCREENS !== '1') {
		expect(existsSync(join(dir, testInfo.project.name, 'quiet.png'))).toBe(
			false,
		);
	}
});

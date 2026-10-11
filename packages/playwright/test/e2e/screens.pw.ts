import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { saveScreen, savingScreens } from '../../src/screens';

/** A PNG's size, from its IHDR chunk. */
const pngSize = (path: string) => {
	const png = readFileSync(path);
	return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
};

// An app shell as tall as the viewport whose `main` holds 2000px of content:
// a plain full-page screenshot stops at the fold.
const SHELL = `<style>body{margin:0;overflow:hidden}</style>
<div style="height:100vh;display:flex;flex-direction:column">
	<header style="height:48px">Header</header>
	<main style="flex:1;overflow:auto"><div style="height:2000px">Tall</div></main>
</div>`;

test('saves the whole of an inner-scrolling shell, then puts the viewport back', async ({
	page,
}, testInfo) => {
	await page.setContent(SHELL);
	const viewport = page.viewportSize();
	const dir = testInfo.outputPath('screens');
	const path = await saveScreen(page, testInfo, 'shell', { dir });
	expect(path).toBe(join(dir, testInfo.project.name, 'shell.png'));
	const { height } = pngSize(path);
	const scale = testInfo.project.use.deviceScaleFactor ?? 1;
	expect(height / scale).toBeGreaterThanOrEqual(2048);
	expect(page.viewportSize()).toEqual(viewport);
});

test("defaults to the config's folder, saving only when its variable is 1", async ({
	page,
}, testInfo) => {
	expect(savingScreens(testInfo)).toBe(process.env.SCREENS === '1');
	await page.setContent('<p>Short</p>');
	const path = await saveScreen(page, testInfo, 'short');
	// `screens: { dir: '../.probe-screens' }`, from test/playwright.config.ts.
	expect(path).toBe(
		join(
			import.meta.dirname,
			'..',
			'..',
			'.probe-screens',
			testInfo.project.name,
			'short.png',
		),
	);
});

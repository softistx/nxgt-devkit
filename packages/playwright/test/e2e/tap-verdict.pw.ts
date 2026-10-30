import { expect, test } from '@playwright/test';
import { tapTargetVerdict } from '../../src/tap-targets';

test.use({ viewport: { width: 412, height: 800 } });

// The function runs in the page as a story's play would call it: its own
// source, evaluated there.
const verdictOf = (
	page: import('@playwright/test').Page,
	selector: string,
	options = '{}',
) =>
	page.evaluate<{
		verdict: string;
		ok: boolean;
		width: number;
		height: number;
	}>(
		`(${tapTargetVerdict})(document.querySelector(${JSON.stringify(selector)}), ${options})`,
	);

const hit =
	'<style>body{margin:24px}.hit{position:relative}.hit::before{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%)}</style>';

test('a 44px box is large; a 40px box is small, with its size', async ({
	page,
}) => {
	await page.setContent(
		'<button id="a" style="width:44px;height:44px"></button><button id="b" style="width:40px;height:40px"></button>',
	);
	expect(await verdictOf(page, '#a')).toEqual({
		verdict: 'large',
		ok: true,
		width: 44,
		height: 44,
	});
	expect(await verdictOf(page, '#b')).toMatchObject({
		verdict: 'small',
		ok: false,
		width: 40,
		height: 40,
	});
});

test('an invisible 44px ::before enlarges a 20px control; hitArea: false does not', async ({
	page,
}) => {
	await page.setContent(
		`${hit}<button id="a" class="hit" style="width:20px;height:20px"></button>`,
	);
	expect(await verdictOf(page, '#a')).toMatchObject({
		verdict: 'enlarged',
		ok: true,
	});
	expect(await verdictOf(page, '#a', '{ hitArea: false }')).toMatchObject({
		verdict: 'small',
		ok: false,
	});
});

test('size moves the bar', async ({ page }) => {
	await page.setContent(
		'<button id="a" style="width:40px;height:40px"></button>',
	);
	expect((await verdictOf(page, '#a', '{ size: 40 }')).ok).toBe(true);
	expect((await verdictOf(page, '#a', '{ size: 48 }')).ok).toBe(false);
});

test('a square near the screen edge is moved inside the viewport', async ({
	page,
}) => {
	// Centre 20px from the edge: the centred square would stick out, so it is
	// probed at x 0..44, where a neighbour covers its last column.
	await page.setContent(
		`${hit}<button id="a" class="hit" style="position:absolute;left:10px;top:100px;width:20px;height:20px"></button><div style="position:absolute;left:0;top:90px;width:44px;height:44px;z-index:-1"></div><div id="n" style="position:absolute;left:43px;top:90px;width:20px;height:44px;background:#ccc;z-index:5"></div>`,
	);
	expect(await verdictOf(page, '#a')).toMatchObject({
		verdict: 'small',
		ok: false,
	});
});

test('an element off screen is scrolled to and the scroll is put back', async ({
	page,
}) => {
	await page.setContent(
		`${hit}<div style="height:2000px"></div><button id="a" class="hit" style="width:20px;height:20px"></button>`,
	);
	expect(await verdictOf(page, '#a')).toMatchObject({ verdict: 'enlarged' });
	expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('a covered element is reported covered, not small', async ({ page }) => {
	await page.setContent(
		'<button id="a" style="position:absolute;left:50px;top:50px;width:20px;height:20px"></button><div style="position:fixed;inset:0;background:#fff"></div>',
	);
	expect(await verdictOf(page, '#a')).toMatchObject({
		verdict: 'covered',
		ok: false,
	});
});

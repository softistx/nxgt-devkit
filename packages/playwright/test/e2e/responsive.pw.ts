import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll } from '../../src/helpers';

test.use({ viewport: { width: 412, height: 800 } });

// Without it, a phone lays the page out 980px wide and zooms it out to fit:
// nothing scrolls, whatever the content.
const html = (body: string) =>
	`<meta name="viewport" content="width=device-width, initial-scale=1">${body}`;

test('a page that fits passes', async ({ page }) => {
	await page.setContent(html('<main><p>Short.</p></main>'));
	await expectNoHorizontalScroll(page);
});

test('a scroller that keeps its overflow inside passes', async ({ page }) => {
	await page.setContent(
		html(
			'<div style="overflow-x:auto"><div style="width:1000px">wide</div></div>',
		),
	);
	await expectNoHorizontalScroll(page);
});

test('a page wider than the viewport fails and names the widest element', async ({
	page,
}) => {
	await page.setContent(
		html(
			'<main><table id="data" class="grid" style="width:900px"><tr><td>a</td></tr></table></main>',
		),
	);
	const error = await expectNoHorizontalScroll(page).catch((e: Error) => e);
	expect(error).toBeInstanceOf(Error);
	const message = (error as Error).message;
	expect(message).toContain('clientWidth 412px');
	expect(message.split('\n')[2]).toMatch(
		/^ {2}- table#data\.grid {2}right \d+px, width 900px$/,
	);
});

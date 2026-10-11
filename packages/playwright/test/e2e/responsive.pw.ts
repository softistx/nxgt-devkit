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

// An app shell as tall as the viewport, whose `main` scrolls: its content
// never widens the document.
const shell = (content: string) =>
	html(`<style>body{margin:0;overflow:hidden}</style>
<div id="app" style="height:100vh;display:flex;flex-direction:column">
	<header style="height:48px">Header</header>
	<main id="content" style="flex:1;overflow:auto">${content}</main>
</div>`);

test.describe('an inner scroll container', () => {
	test('the document check alone misses its overflow', async ({ page }) => {
		await page.setContent(
			shell('<pre id="log" style="width:900px">wide</pre>'),
		);
		await expectNoHorizontalScroll(page);
	});

	test('scroller: fails and names the container and the element', async ({
		page,
	}) => {
		await page.setContent(
			shell('<pre id="log" style="width:900px">wide</pre>'),
		);
		const error = await expectNoHorizontalScroll(page, {
			scroller: 'main',
		}).catch((e: Error) => e);
		expect(error).toBeInstanceOf(Error);
		const [first, , offender] = (error as Error).message.split('\n');
		expect(first).toMatch(
			/^The scroll container main#content scrolls horizontally: scrollWidth \d+px > clientWidth 412px\.$/,
		);
		expect(offender).toBe('  - pre#log  right 900px, width 900px');
	});

	test('scroller: a table in its own scroller inside passes', async ({
		page,
	}) => {
		await page.setContent(
			shell(
				'<div style="overflow-x:auto"><table style="width:900px"><tr><td>a</td></tr></table></div>',
			),
		);
		await expectNoHorizontalScroll(page, {
			scroller: page.locator('main'),
		});
	});

	test('scroller: a page without it checks the document only', async ({
		page,
	}) => {
		await page.setContent(html('<p>No shell here.</p>'));
		await expectNoHorizontalScroll(page, { scroller: 'main' });
	});
});

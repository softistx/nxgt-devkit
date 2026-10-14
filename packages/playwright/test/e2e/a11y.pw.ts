import { test as base, expect, type Page } from '@playwright/test';
import {
	accessibilityScan,
	DEFAULT_UNSTICK,
	expectAccessible,
	withA11y,
} from '../../src/a11y';

const page = (body: string) =>
	`<!doctype html><html lang="en"><head><title>Probe</title></head><body><main><h1>Probe</h1>${body}</main></body></html>`;
const PIXEL =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const CLEAN = page(`<img src="${PIXEL}" alt="A dot">`);
const NO_ALT = page(`<img id="logo" src="${PIXEL}">`);

base('a clean page passes', async ({ page }) => {
	await page.setContent(CLEAN);
	const results = await expectAccessible(page);
	expect(results.violations).toEqual([]);
});

base(
	'an image without alt fails with a readable message and the report attached',
	async ({ page }, testInfo) => {
		await page.setContent(NO_ALT);
		const error = await expectAccessible(page).catch((e: Error) => e);
		expect(error).toBeInstanceOf(Error);
		const message = (error as Error).message;
		expect(message).toContain('1 accessibility violation');
		expect(message).toContain(
			'image-alt [critical] Images must have alternative text',
		);
		expect(message).toMatch(
			/https:\/\/dequeuniversity\.com\/rules\/axe\/[\d.]+\/image-alt/,
		);
		expect(message).toContain('   - #logo');
		expect(message).toContain('<img id="logo"');
		const report = testInfo.attachments.find(
			(a) => a.name === 'accessibility-scan.json',
		);
		expect(report?.contentType).toBe('application/json');
		const json = JSON.parse(String(report?.body));
		expect(json.violations[0].id).toBe('image-alt');
	},
);

base(
	'a rule disabled with a reason, or an excluded node, passes',
	async ({ page }) => {
		await page.setContent(NO_ALT);
		await expectAccessible(page, {
			disableRules: [
				{ rule: 'image-alt', reason: 'decorative dot, probe page' },
			],
		});
		await expectAccessible(page, { exclude: '#logo' });
		await expectAccessible(page, { include: 'h1' });
	},
);

base(
	'tags narrow the scan; accessibilityScan does not assert',
	async ({ page }) => {
		await page.setContent(NO_ALT);
		await expectAccessible(page, { tags: ['wcag22aa'] });
		const results = await accessibilityScan(page);
		expect(results.violations.map((v) => v.id)).toEqual(['image-alt']);
	},
);

// A tall form of valid 24px buttons with gaps, in a scrolling main; a sticky
// bar of its own valid buttons stops half over the last small button.
const stickyPage = (bar: string, css = '') => {
	const buttons = Array.from(
		{ length: 12 },
		(_, i) =>
			`<button type="button" aria-label="Item ${i}" style="display:block;width:24px;height:24px;margin:0 0 24px;padding:0"></button>`,
	).join('');
	return `<!doctype html><html lang="en"><head><title>Probe</title><style>
body{margin:0}main{height:300px;overflow:auto}form{padding-bottom:100px}
.my-bar{position:sticky;bottom:0}${css}</style></head><body><main><h1>Probe</h1><form>${buttons}${bar}</form></main></body></html>`;
};
const BAR_INNER =
	'<button type="button" style="height:40px;min-width:44px">Save</button>';
const BAR_STYLE = 'background:#eee;height:40px';
const STICKY_INLINE = stickyPage(
	`<div id="bar" data-slot="form-actions" style="position:sticky;bottom:0;${BAR_STYLE}">${BAR_INNER}</div>`,
);
const STICKY_CLASS = stickyPage(
	`<div id="bar" data-slot="form-actions" class="my-bar" style="${BAR_STYLE}">${BAR_INNER}</div>`,
);
const CUSTOM_BAR = stickyPage(
	`<div id="bar" class="my-bar" style="${BAR_STYLE}">${BAR_INNER}</div>`,
);

/** Scrolls so that the bar sits across the middle of the last small button. */
async function stopUnderTheBar(page: Page) {
	await page.evaluate(() => {
		const main = document.querySelector('main') as HTMLElement;
		const last = document.querySelector('[aria-label="Item 11"]') as Element;
		const bar = document.querySelector('#bar') as Element;
		const barTop =
			main.getBoundingClientRect().bottom - bar.getBoundingClientRect().height;
		main.scrollTop += last.getBoundingClientRect().top + 12 - barTop;
	});
}
const barStyle = (page: Page) =>
	page.evaluate(
		() => (document.querySelector('#bar') as HTMLElement).style.cssText,
	);

base(
	'a sticky form bar is put back in the flow while axe runs',
	async ({ page }) => {
		await page.setContent(STICKY_INLINE);
		await stopUnderTheBar(page);
		await expectAccessible(page);
	},
);

base('unstick: [] shows the target-size false positive', async ({ page }) => {
	await page.setContent(STICKY_INLINE);
	await stopUnderTheBar(page);
	const error = await expectAccessible(page, { unstick: [] }).catch(
		(e: Error) => e,
	);
	expect((error as Error).message).toContain('target-size [serious]');
});

base("a custom selector unsticks the app's own bar", async ({ page }) => {
	await page.setContent(CUSTOM_BAR);
	await stopUnderTheBar(page);
	await expect(expectAccessible(page)).rejects.toThrow('target-size');
	await expectAccessible(page, { unstick: ['.my-bar'] });
	await expectAccessible(page, { unstick: '#bar' });
	await expectAccessible(page, {
		unstick: [...DEFAULT_UNSTICK, '.my-bar'],
	});
});

base(
	"the bar's inline style is restored, even from a stylesheet class",
	async ({ page }) => {
		await page.setContent(STICKY_INLINE);
		const inline = await barStyle(page);
		await accessibilityScan(page);
		expect(await barStyle(page)).toBe(inline);

		await page.setContent(STICKY_CLASS);
		const before = await barStyle(page);
		expect(before).not.toContain('position');
		await accessibilityScan(page, { unstick: '.my-bar' });
		expect(await barStyle(page)).toBe(before);
		await expect(page.locator('#bar')).toHaveCSS('position', 'sticky');
	},
);

base(
	'an !important inline position is restored with its priority',
	async ({ page }) => {
		await page.setContent(
			stickyPage(
				`<div id="bar" data-slot="form-actions" style="position:sticky !important;${BAR_STYLE}">${BAR_INNER}</div>`,
			),
		);
		const before = await barStyle(page);
		await accessibilityScan(page);
		expect(await barStyle(page)).toBe(before);
	},
);

base('a selector that matches nothing is fine', async ({ page }) => {
	await page.setContent(CLEAN);
	await expectAccessible(page, { unstick: ['.nothing-here'] });
});

const test = withA11y(base);

test('the a11y fixture is bound to the page', async ({ page, a11y }) => {
	await page.setContent(NO_ALT);
	await expect(a11y.expect()).rejects.toThrow('image-alt');
	expect((await a11y.scan()).violations).toHaveLength(1);
});

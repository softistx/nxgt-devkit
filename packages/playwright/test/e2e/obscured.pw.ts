import { expect, test } from '@playwright/test';
import {
	expectFieldsAboveActions,
	expectFocusAboveActions,
	withA11y,
} from '../../src/a11y';

const BAR = 80;
const fields = (count: number) =>
	Array.from(
		{ length: count },
		(_, i) =>
			`<div data-slot="text-field"><label>Field ${i}<input id="f${i}" name="f${i}"></label><p class="error">Required</p></div>`,
	).join('');

/** A scrolling form with a sticky actions bar; `padded` reserves the bar's height. */
const form = ({
	padded,
	count = 10,
	slot = 'form-actions',
	field = 'text-field',
}: {
	padded: boolean;
	count?: number;
	slot?: string;
	field?: string;
}) =>
	`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Probe</title><style>
input { scroll-margin-bottom: ${padded ? 100 : 0}px; }
html { ${padded ? `scroll-padding-bottom: ${BAR + 8}px;` : ''} }
body { margin: 0; }
[data-slot$="-field"] { height: 110px; box-sizing: border-box; }
.error { margin: 0; height: 20px; }
[data-slot="${slot}"] { position: sticky; bottom: 0; height: ${BAR}px; background: #ddd; }
</style></head><body><form>${fields(count).replaceAll('text-field', field)}<div data-slot="${slot}"><button type="submit" data-pw="submit">Save</button></div></form></body></html>`;

test.beforeEach(async ({ page }) => {
	await page.setViewportSize({ width: 400, height: 400 });
});

test('a form that scrolls its focus above the bar passes', async ({ page }) => {
	await page.setContent(form({ padded: true }));
	await page.locator('#f0').focus();
	await expectFieldsAboveActions(page);
});

test('a control left under the bar fails, naming it and the overlap', async ({
	page,
}) => {
	await page.setContent(form({ padded: false }));
	await page.locator('#f0').focus();
	const error = await expectFieldsAboveActions(page).catch((e: Error) => e);
	expect(error).toBeInstanceOf(Error);
	const message = (error as Error).message;
	expect(message).toMatch(/ends \d+px under the sticky bar/);
	expect(message).toContain('[data-slot="form-actions"]');
	expect(message).toContain('input #f');
	expect(message).toContain('name="f');
	expect(message).toContain('<input');
});

test('the field wrapper counts: an input clear of the bar but not its error', async ({
	page,
}) => {
	await page.setContent(form({ padded: false, count: 6 }));
	await page.evaluate(() => {
		const input = document.querySelector<HTMLElement>('#f3');
		// Put the input just above the bar, its error line beneath the bar's top.
		const bar = document.querySelector('[data-slot="form-actions"]');
		const gap = (bar?.getBoundingClientRect().top ?? 0) - 40;
		const rect = input?.getBoundingClientRect();
		window.scrollBy(0, (rect?.bottom ?? 0) - gap);
		input?.focus({ preventScroll: true });
	});
	await expect(expectFocusAboveActions(page)).rejects.toThrow(
		/under the sticky bar/,
	);
	await expectFocusAboveActions(page, { field: '.nothing' });
});

test('a control inside the bar counts as clear', async ({ page }) => {
	await page.setContent(form({ padded: false }));
	await page.getByTestId('submit').focus();
	await expectFocusAboveActions(page);
});

test('no bar is an error naming the selector, never a pass', async ({
	page,
}) => {
	await page.setContent('<main><input id="a"></main>');
	await page.locator('#a').focus();
	await expect(expectFocusAboveActions(page)).rejects.toThrow(
		'no element matches [data-slot="form-actions"]: the check cannot run',
	);
	await expect(
		expectFieldsAboveActions(page, { actions: '.bar' }),
	).rejects.toThrow('no element matches .bar: the check cannot run');
});

test('actions, field and until can be set', async ({ page }) => {
	await page.setContent(
		form({ padded: true, slot: 'bottom-bar', field: 'row' }).replace(
			'<button type="submit"',
			'<button type="button" id="done"></button><button type="submit"',
		),
	);
	await page.locator('#f0').focus();
	await expectFieldsAboveActions(page, {
		actions: '[data-slot="bottom-bar"]',
		field: '[data-slot="row"]',
		until: page.locator('#done'),
	});
});

test('limit exceeded names the limit and the control', async ({ page }) => {
	await page.setContent(form({ padded: true }));
	await page.locator('#f0').focus();
	await expect(expectFieldsAboveActions(page, { limit: 3 })).rejects.toThrow(
		/the submit was not reached in 3 tabs \(.*submit.*\)/,
	);
});

withA11y(test)(
	'the a11y fixture carries both checks',
	async ({ page, a11y }) => {
		await page.setContent(form({ padded: true }));
		await page.locator('#f0').focus();
		await a11y.focusAboveActions();
		await a11y.fieldsAboveActions();
	},
);

test('padding alone leaves the error line under the bar', async ({ page }) => {
	await page.setContent(
		form({ padded: true }).replace(
			'input { scroll-margin-bottom: 100px; }',
			'',
		),
	);
	await page.locator('#f0').focus();
	await expect(expectFieldsAboveActions(page)).rejects.toThrow(
		/scroll-margin-bottom for the error line beneath it/,
	);
});

test('a static bar mid-page does not obscure a later field', async ({
	page,
}) => {
	await page.setContent(
		`<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0}[data-slot="form-actions"]{height:60px}</style>
<input id="a"><div data-slot="form-actions"><button type="submit">Save</button></div>
<div style="height:100px"></div><div data-slot="text-field"><input id="b"></div>`,
	);
	await page.locator('#b').focus();
	await expectFocusAboveActions(page);
});

test('a bar that does not render is ignored; the control is measured against the rendered one', async ({
	page,
}) => {
	await page.setContent(
		form({ padded: false }).replace(
			'</form>',
			'</form><div data-slot="form-actions" style="display:none"></div>',
		),
	);
	await page.locator('#f0').focus();
	await expect(expectFieldsAboveActions(page)).rejects.toThrow(
		/under the sticky bar/,
	);
	await page.setContent(
		form({ padded: true }).replace(
			'</form>',
			'</form><div data-slot="form-actions" style="display:none"></div>',
		),
	);
	await page.locator('#f0').focus();
	await expectFieldsAboveActions(page);
});

test('only hidden bars match: nothing to be obscured by passes the rectangle test', async ({
	page,
}) => {
	await page.setContent(
		'<div data-slot="form-actions" style="display:none"></div><input id="a">',
	);
	await page.locator('#a').focus();
	await expectFocusAboveActions(page);
});

test('nothing focused is an error; the tabbing starts from the page', async ({
	page,
}) => {
	await page.setContent(form({ padded: true }));
	await expect(expectFocusAboveActions(page)).rejects.toThrow(
		'nothing is focused: focus a control before checking',
	);
	await expectFieldsAboveActions(page);
});

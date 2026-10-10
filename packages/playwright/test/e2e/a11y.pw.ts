import { test as base, expect } from '@playwright/test';
import { accessibilityScan, expectAccessible, withA11y } from '../../src/a11y';

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

const test = withA11y(base);

test('the a11y fixture is bound to the page', async ({ page, a11y }) => {
	await page.setContent(NO_ALT);
	await expect(a11y.expect()).rejects.toThrow('image-alt');
	expect((await a11y.scan()).violations).toHaveLength(1);
});

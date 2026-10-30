import { expect, test } from '@playwright/test';
import { DEFAULT_UNSTICK, withOverlaysInFlow } from '../../src/a11y';

const html = `<!doctype html><html lang="en"><head><title>Probe</title><style>
body { margin: 0; }
main { height: 1200px; }
[data-slot="form-actions"] { position: sticky; bottom: 0; height: 60px; }
</style></head><body><main>Content</main><div data-slot="form-actions" style="position: sticky">Save</div></body></html>`;

const position = (page: import('@playwright/test').Page) =>
	page
		.locator('[data-slot="form-actions"]')
		.evaluate((el) => getComputedStyle(el).position);

test('withOverlaysInFlow puts the bar in flow, then restores it', async ({
	page,
}) => {
	await page.setContent(html);
	await page.setViewportSize({ width: 400, height: 400 });
	expect(await position(page)).toBe('sticky');
	const inside = await withOverlaysInFlow(page, DEFAULT_UNSTICK, () =>
		position(page),
	);
	expect(inside).toBe('static');
	expect(await position(page)).toBe('sticky');
	expect(
		await page
			.locator('[data-slot="form-actions"]')
			.evaluate((el) => (el as HTMLElement).style.position),
	).toBe('sticky');
});

test('withOverlaysInFlow restores the bar when the step throws', async ({
	page,
}) => {
	await page.setContent(html);
	await expect(
		withOverlaysInFlow(page, DEFAULT_UNSTICK, async () => {
			throw new Error('boom');
		}),
	).rejects.toThrow('boom');
	expect(await position(page)).toBe('sticky');
});

import { test as base, expect } from '@playwright/test';
import { hydrated, hydrationWarnings, withHydration } from '../../src/helpers';

const test = withHydration(base);
const marker = (page: import('@playwright/test').Page) =>
	page.evaluate(() => document.documentElement.dataset.hydrated);

test('goto resolves once the page is hydrated: the first click counts', async ({
	page,
}) => {
	await page.goto('/hydrating');
	expect(await marker(page)).toBe('');
	await page.getByTestId('go').click();
	await expect(page.getByTestId('out')).toHaveText('clicked');
});

test('so does the goto of a page opened later in the context', async ({
	context,
}) => {
	const page = await context.newPage();
	await page.goto('/hydrating');
	expect(await marker(page)).toBe('');
});

test('a response that is not a document is returned without waiting', async ({
	page,
}) => {
	const response = await page.goto('/data.json');
	expect(await response?.json()).toEqual({ ok: true });
});

test.describe('with hydration: false', () => {
	test.use({ hydration: false });

	test('goto is the plain one', async ({ page }) => {
		await page.goto('/hydrating');
		expect(await marker(page)).toBeUndefined();
	});
});

test.describe('hydrated', () => {
	test.use({ hydration: false });

	test('takes a function marker', async ({ page }) => {
		await page.goto('/hydrating');
		await hydrated(page, {
			marker: () => document.documentElement.hasAttribute('data-hydrated'),
		});
		expect(await marker(page)).toBe('');
	});

	test('names the page and the marker when it never hydrates', async ({
		page,
	}) => {
		await page.goto('/never');
		const error = await hydrated(page, { timeout: 300 }).catch((e: Error) => e);
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toContain(
			'/never was not hydrated after 300ms (marker: html[data-hydrated])',
		);
	});
});

base('hydrationWarnings collects mismatch warnings only', async ({ page }) => {
	const warnings = hydrationWarnings(page);
	await page.goto('/mismatch');
	await expect.poll(() => warnings.length).toBe(2);
	expect(warnings[0]).toContain('did not match');
	expect(warnings[1]).toContain('Hydration failed');
});

test('about:blank and a data: URL are returned without waiting', async ({
	page,
}) => {
	await page.goto('about:blank');
	await page.goto('data:text/html,<p>static</p>');
	await expect(page.locator('p')).toHaveText('static');
});

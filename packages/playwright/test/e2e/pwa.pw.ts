import { expect, test } from '@playwright/test';
import {
	cachedUrls,
	expectNotCached,
	serviceWorkerControlled,
} from '../../src/pwa';

test('a worker takes control and its caches are listed', async ({ page }) => {
	await page.goto('/sw-page');
	await serviceWorkerControlled(page);
	await expect
		.poll(() => cachedUrls(page))
		.toEqual({ 'probe-v1': ['/sw-page', '/data.json?v=1'] });
});

test('expectNotCached passes for a URL no cache holds, and names the cache that does', async ({
	page,
}) => {
	await page.goto('/');
	await page.evaluate(async () => {
		const cache = await caches.open('pages');
		await cache.put('/account', new Response('signed in'));
	});
	await expectNotCached(page, '/sign-out');
	await expectNotCached(page, /^\/api\//);
	const error = await expectNotCached(page, /^\/acc/).catch((e: Error) => e);
	expect(error).toBeInstanceOf(Error);
	expect((error as Error).message).toContain(
		'/^\\/acc/ is cached: pages (/account)',
	);
});

test('serviceWorkerControlled says why when no worker controls the page', async ({
	page,
}) => {
	await page.goto('/');
	const error = await serviceWorkerControlled(page, { timeout: 300 }).catch(
		(e: Error) => e,
	);
	expect(error).toBeInstanceOf(Error);
	expect((error as Error).message).toContain(
		`No service worker controls ${page.url()} after 300ms`,
	);
});

import { expect, test } from '@playwright/test';

test('enableMocking({ enabled: true }) starts the worker and a handler answers the fetch', async ({
	page,
}) => {
	await page.goto('/?mocks=1');
	await expect(page.locator('body')).toHaveAttribute('data-status', '200');
	await expect(page.locator('body')).toHaveAttribute('data-worker', 'true');
	const answer = JSON.parse(
		(await page.locator('body').getAttribute('data-answer')) ?? '',
	);
	expect(answer).toEqual({ data: { student: { id: '7', name: 'Ada' } } });
	// The worker script served by the test server is what intercepted it.
	const registrations = await page.evaluate(async () =>
		(await navigator.serviceWorker.getRegistrations()).map(
			(r) => r.active?.scriptURL,
		),
	);
	expect(registrations).toContain('http://localhost:4598/mockServiceWorker.js');
});

test('enabled: false starts nothing, and the fetch reaches the server', async ({
	page,
}) => {
	await page.goto('/');
	await expect(page.locator('body')).toHaveAttribute('data-status', '404');
	await expect(page.locator('body')).toHaveAttribute('data-worker', 'false');
	await expect(page.locator('body')).toHaveAttribute(
		'data-answer',
		'no API here',
	);
});

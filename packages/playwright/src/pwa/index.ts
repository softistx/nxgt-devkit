import { expect, type Page } from '@playwright/test';

/**
 * Resolves once a service worker controls the page
 * (`navigator.serviceWorker.controller`): after the worker's
 * `clients.claim()`, or a reload once it is active. Run against a build that registers the worker; Playwright's
 * `serviceWorkers` must be `'allow'` (the default).
 */
export async function serviceWorkerControlled(
	page: Page,
	{ timeout = 15_000 }: { timeout?: number } = {},
): Promise<void> {
	await page
		.waitForFunction(
			() =>
				'serviceWorker' in navigator &&
				navigator.serviceWorker.controller !== null,
			undefined,
			{ timeout, polling: 100 },
		)
		.catch((error: Error) => {
			throw new Error(
				`No service worker controls ${page.url()} after ${timeout}ms: is it registered in this build, ` +
					"and does it call clients.claim()? Playwright's `serviceWorkers` must not be 'block'.\n" +
					error.message,
			);
		});
}

/**
 * Every URL in every Cache Storage cache of the page's origin, by cache name.
 * A URL of the page's origin is given as path and query (`/assets/app.js`,
 * `/manifest.webmanifest?lang=fr`); another origin's in full.
 */
export function cachedUrls(page: Page): Promise<Record<string, string[]>> {
	return page.evaluate(async () => {
		const entries: Record<string, string[]> = {};
		for (const name of await caches.keys()) {
			const cache = await caches.open(name);
			entries[name] = (await cache.keys()).map((request) => {
				const url = new URL(request.url);
				return url.origin === location.origin
					? url.pathname + url.search
					: url.href;
			});
		}
		return entries;
	});
}

/**
 * Fails when any cache holds `url` — a path and query as `cachedUrls` gives
 * them, or a pattern — naming the caches that do. For what must never be
 * kept: a signed-in page, an API answer, a file behind a session.
 */
export async function expectNotCached(
	page: Page,
	url: string | RegExp,
): Promise<void> {
	const matches = (entry: string) =>
		typeof url === 'string' ? entry === url : url.test(entry);
	const holding = Object.entries(await cachedUrls(page))
		.map(([name, urls]) => [name, urls.filter(matches)] as const)
		.filter(([, urls]) => urls.length > 0);
	expect(
		holding,
		`${String(url)} is cached: ${holding
			.map(([name, urls]) => `${name} (${urls.join(', ')})`)
			.join('; ')}`,
	).toEqual([]);
}

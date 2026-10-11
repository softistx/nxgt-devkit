import type { Page } from '@playwright/test';

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

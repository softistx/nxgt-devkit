import type { Page } from '@playwright/test';
import { serviceWorkerControlled } from './worker';

export type GoOfflineOptions = {
	/**
	 * Wait for a service worker to control the page first, so the offline
	 * requests go through it. `false` for an app without one. Default `true`.
	 */
	worker?: boolean;
	/** For the worker wait. Default `15_000`. */
	timeout?: number;
};

/**
 * Cuts the network of the page's whole context (`context.setOffline(true)`),
 * once a service worker controls the page: offline before that, a load shows
 * the browser's own error page rather than the worker's answer. Every page
 * of the context, and its worker's fetches in Chromium, are offline until
 * `goOnline`.
 */
export async function goOffline(
	page: Page,
	{ worker = true, timeout }: GoOfflineOptions = {},
): Promise<void> {
	if (worker) await serviceWorkerControlled(page, { timeout });
	await page.context().setOffline(true);
}

/** Gives the page's context its network back (`context.setOffline(false)`). */
export async function goOnline(page: Page): Promise<void> {
	await page.context().setOffline(false);
}

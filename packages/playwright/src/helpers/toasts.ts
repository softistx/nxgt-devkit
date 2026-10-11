import { expect, type Page } from '@playwright/test';

export type ToastsGoneOptions = {
	/** What a toast is. Default `[data-sonner-toast]` (sonner's). */
	selector?: string;
	/** How long the toasts may take to go. Default `15_000`. */
	timeout?: number;
};

/**
 * Waits for the toast saying `text` to show, then for every toast to go.
 *
 * A toast mounts a moment after the action that raised it, so waiting for
 * none alone would pass before it showed. A pointer resting on a toast pauses
 * it, and the pointer is usually still on the button that raised it — on a
 * phone, toasts sit over the bottom of the page, where that button often is —
 * so the mouse is moved to the top-left corner first.
 */
export async function toastsGone(
	page: Page,
	text: string | RegExp,
	{
		selector = '[data-sonner-toast]',
		timeout = 15_000,
	}: ToastsGoneOptions = {},
): Promise<void> {
	const toasts = page.locator(selector);
	await expect(toasts.filter({ hasText: text }).first()).toBeVisible();
	await page.mouse.move(0, 0);
	await expect(toasts).toHaveCount(0, { timeout });
}

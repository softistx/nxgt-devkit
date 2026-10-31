import type { Page } from '@playwright/test';
import { nextFrames } from '../helpers/frames';

export type ScreenViewport = { width: number; height: number };

/**
 * Runs `run` with the page resized to `viewport`, then puts the previous
 * viewport back, also when `run` throws. Without a `viewport`, or on a page
 * without a viewport size (`viewport: null`), it only runs `run`.
 */
export async function withViewport<T>(
	page: Page,
	viewport: ScreenViewport | undefined,
	run: () => Promise<T>,
): Promise<T> {
	const previous = page.viewportSize();
	if (!viewport) return run();
	try {
		await page.setViewportSize(viewport);
		// What reacts to a resize (a toolbar that collapses on a phone) is in
		// place before the page is saved or measured.
		await nextFrames(page);
		return await run();
	} finally {
		if (previous) {
			await page.setViewportSize(previous);
			await nextFrames(page);
		}
	}
}

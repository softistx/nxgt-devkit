import type { Page } from '@playwright/test';
import { nextFrames } from '../helpers/frames';

/** The pointer a screen is judged with: `'fine'` is the project's own, `'coarse'` is a finger. */
export type ScreenPointer = 'fine' | 'coarse';

/**
 * Runs `run` with the page reporting a coarse pointer (`@media (pointer:
 * coarse)`, `navigator.maxTouchPoints`), then switches touch emulation off
 * again, also when `run` throws. `'fine'` or no pointer only runs
 * `run`: it keeps the project's pointer and does not force a mouse. A page that
 * already has touch (`navigator.maxTouchPoints > 0`, a `hasTouch` project) is
 * left alone, with no emulation enabled or disabled.
 *
 * Switching touch emulation off restores the pointer Chromium reads from the
 * machine, not the mouse Playwright's headless launch fakes with
 * `--blink-settings=primaryPointerType=4,…`. On a machine with no pointing
 * device (a headless Linux CI runner) the page then reports `pointer: none`
 * and `hover: none`: a navigation brings the mouse back on Playwright 1.64,
 * not even `page.reload` does on 1.61, and no CDP call does. A new page does. `pointer: coarse` and
 * `navigator.maxTouchPoints` are always back to the page's own.
 *
 * Chromium only: it is Chrome DevTools Protocol's
 * `Emulation.setTouchEmulationEnabled`, applied to the live page, because
 * `hasTouch` is a context option fixed at creation. Any other engine throws
 * before `run` starts, rather than judging the screen with the wrong pointer
 * and passing or failing for the wrong reason.
 */
export async function withPointer<T>(
	page: Page,
	pointer: ScreenPointer | undefined,
	run: () => Promise<T>,
): Promise<T> {
	if (pointer === undefined || pointer === 'fine') return run();
	if (pointer !== 'coarse') {
		throw new Error(
			`checkScreen: pointer must be 'fine' or 'coarse', got ${JSON.stringify(pointer)}.`,
		);
	}
	const context = page.context();
	// A persistent context has no browser: let the CDP session decide.
	const engine = context.browser()?.browserType().name();
	if (engine !== undefined && engine !== 'chromium') {
		throw new Error(
			`checkScreen: pointer: 'coarse' needs Chromium (it uses CDP touch emulation), but this page runs on ${engine}. Run the check in a chromium project, or set hasTouch on a ${engine} project instead.`,
		);
	}
	// A page that already has touch (a hasTouch project) has a coarse pointer:
	// nothing to enable, and nothing to disable afterwards.
	const touchPoints = await page.evaluate(() => navigator.maxTouchPoints);
	if (touchPoints > 0) return run();
	const cdp = await context.newCDPSession(page);
	try {
		await cdp.send('Emulation.setTouchEmulationEnabled', {
			enabled: true,
			maxTouchPoints: 5,
		});
		// Styles under (pointer: coarse) are applied before the page is measured.
		await nextFrames(page);
		return await run();
	} finally {
		try {
			// A failing disable must not hide the check's own error.
			await cdp
				.send('Emulation.setTouchEmulationEnabled', { enabled: false })
				.catch(() => undefined);
		} finally {
			await cdp.detach().catch(() => undefined);
		}
	}
}

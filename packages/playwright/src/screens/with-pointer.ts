import type { Page } from '@playwright/test';
import { nextFrames } from '../helpers/frames';

/** The pointer a screen is judged with: `'fine'` is the project's own, `'coarse'` is a finger. */
export type ScreenPointer = 'fine' | 'coarse';

/**
 * Runs `run` with the page reporting a coarse pointer (`@media (pointer:
 * coarse)`, `hover: none`, `navigator.maxTouchPoints`), then puts the project's
 * own pointer back, also when `run` throws. `'fine'` or no pointer only runs
 * `run`.
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
			await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
		} finally {
			await cdp.detach().catch(() => undefined);
		}
	}
}

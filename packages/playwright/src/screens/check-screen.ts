import type { Page, TestInfo } from '@playwright/test';
import type { A11yOptions } from '../a11y/options';
import { expectAccessible } from '../a11y/scan';
import { settled } from '../helpers/frames';
import {
	expectNoHorizontalScroll,
	type NoHorizontalScrollOptions,
} from '../helpers/no-horizontal-scroll';
import {
	type SaveScreenOptions,
	saveScreen,
	savingScreens,
} from './save-screen';

export type CheckScreenOptions = {
	/**
	 * The accessibility scan. Default `expectAccessible(page, { testInfo })`;
	 * an options object is `expectAccessible`'s own (`exclude`,
	 * `disableRules`, …); a function replaces the scan (an app's wrapper
	 * around `expectAccessible`) and is called with the page; `false` skips
	 * it, and `@axe-core/playwright` is then never loaded.
	 */
	a11y?: A11yOptions | false | ((page: Page) => Promise<unknown>);
	/**
	 * The inner scroll container `expectNoHorizontalScroll` checks as well as
	 * the document: a selector, or a function of the test, so that a phone
	 * project can name another one (`undefined` checks the document only).
	 */
	scroller?: string | ((testInfo: TestInfo) => string | undefined);
	/** `false` skips the sideways-scroll check. Default `true`. */
	horizontalScroll?: boolean;
	/** `saveScreen`'s options, used when the run saves screens. */
	save?: SaveScreenOptions;
	/** `expectNoHorizontalScroll`'s `max`. */
	max?: NoHorizontalScrollOptions['max'];
};

/**
 * Everything a screen goes through, in one call: waits for web fonts and for
 * motion to end, saves the screen when the run saves them (`SCREENS=1`) —
 * before the checks, so a failing one still leaves the image to look at —
 * then scans it for accessibility violations and checks that nothing scrolls
 * sideways.
 *
 * ```ts
 * await page.goto('/students');
 * await checkScreen(page, testInfo, 'students-list', {
 *   scroller: (info) => (isMobileProject(info) ? '[data-slot="table-wrapper"]' : undefined),
 * });
 * ```
 */
export async function checkScreen(
	page: Page,
	testInfo: TestInfo,
	name: string,
	{
		a11y,
		scroller,
		horizontalScroll = true,
		save,
		max,
	}: CheckScreenOptions = {},
): Promise<void> {
	// Web fonts change widths, and a scan half-way through a transition reads
	// colours never shown at rest: measure once fonts are in and motion is over.
	await page.evaluate(() => document.fonts.ready);
	await settled(page);
	// Saved first, so a failing check still leaves the screen to look at.
	if (savingScreens(testInfo)) await saveScreen(page, testInfo, name, save);
	if (typeof a11y === 'function') await a11y(page);
	else if (a11y !== false) await expectAccessible(page, { ...a11y, testInfo });
	if (!horizontalScroll) return;
	await expectNoHorizontalScroll(page, {
		max,
		scroller: typeof scroller === 'function' ? scroller(testInfo) : scroller,
	});
}

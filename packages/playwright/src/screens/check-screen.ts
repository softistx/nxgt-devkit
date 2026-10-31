import type { Locator, Page, TestInfo } from '@playwright/test';
import type { A11yOptions } from '../a11y/options';
import { expectAccessible } from '../a11y/scan';
import { settled } from '../helpers/frames';
import {
	expectNoHorizontalScroll,
	type NoHorizontalScrollOptions,
} from '../helpers/no-horizontal-scroll';
import {
	expectTapTargets,
	type TapTargetOptions,
} from '../helpers/tap-targets';
import {
	expectNoTextOverflow,
	type TextOverflowOptions,
} from '../helpers/text-overflow';
import {
	type SaveScreenOptions,
	saveScreen,
	savingScreens,
} from './save-screen';
import { type ScreenViewport, withViewport } from './with-viewport';

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
	 * the document: a selector or a locator, or a function of the test, so that a phone
	 * project can name another one (`undefined` checks the document only).
	 */
	scroller?:
		| string
		| Locator
		| ((testInfo: TestInfo) => string | Locator | undefined);
	/** `false` skips the sideways-scroll check. Default `true`. */
	horizontalScroll?: boolean;
	/**
	 * `expectNoTextOverflow`: a text that runs past its box, or is clipped
	 * with nothing to read it in full. `true` checks the whole body, an
	 * options object is `expectNoTextOverflow`'s own, and a function of the
	 * test picks per project, as `tapTargets` does. Default `false`: a
	 * design may clip on purpose, so a screen opts in. Runs after the
	 * sideways-scroll check.
	 */
	textOverflow?:
		| boolean
		| TextOverflowOptions
		| ((testInfo: TestInfo) => boolean | TextOverflowOptions);
	/**
	 * `expectTapTargets`: a link, button or control smaller than 44x44 CSS
	 * pixels, a thumb's size. `true` checks the document in every project, an
	 * options object is `expectTapTargets`'s own, and a function of the test
	 * picks per project: `(info) => isMobileProject(info)` for phones only.
	 * Default `false`: a desktop layout has small targets on purpose. WCAG
	 * 2.5.8's 24px minimum is axe's `target-size`, which the default `a11y`
	 * scan already runs. Runs last.
	 */
	tapTargets?:
		| boolean
		| TapTargetOptions
		| ((testInfo: TestInfo) => boolean | TapTargetOptions);
	/**
	 * Resizes the page to this viewport for the whole call — the save and every
	 * check run at that size — then restores the previous one, also when a
	 * check throws. A phone screen inside a desktop pass:
	 * `{ width: 390, height: 844 }`. Wins over `save.viewport`.
	 */
	viewport?: ScreenViewport;
	/** `saveScreen`'s options, used when the run saves screens. */
	save?: SaveScreenOptions;
	/** `expectNoHorizontalScroll`'s `max`, and `expectNoTextOverflow`'s and `expectTapTargets`'s unless they set their own. */
	max?: NoHorizontalScrollOptions['max'];
};

/**
 * Everything a screen goes through, in one call: waits for web fonts and for
 * motion to end, saves the screen when the run saves them (`SCREENS=1`) —
 * before the checks, so a failing one still leaves the image to look at —
 * then scans it for accessibility violations, checks that nothing scrolls
 * sideways and, when asked, that no text overflows its box and that every tap target
 * is big enough for a thumb.
 *
 * ```ts
 * await page.goto('/students');
 * await checkScreen(page, testInfo, 'students-list', {
 *   scroller: (info) => (isMobileProject(info) ? '[data-slot="table-wrapper"]' : undefined),
 * });
 * ```
 */
export function checkScreen(
	page: Page,
	testInfo: TestInfo,
	name: string,
	options: CheckScreenOptions = {},
): Promise<void> {
	return withViewport(page, options.viewport, () =>
		checkCurrentScreen(page, testInfo, name, options),
	);
}

async function checkCurrentScreen(
	page: Page,
	testInfo: TestInfo,
	name: string,
	{
		a11y,
		scroller,
		horizontalScroll = true,
		textOverflow = false,
		tapTargets = false,
		save,
		max,
	}: CheckScreenOptions,
): Promise<void> {
	// Web fonts change widths, and a scan half-way through a transition reads
	// colours never shown at rest: measure once fonts are in and motion is over.
	await page.evaluate(() => document.fonts.ready);
	await settled(page);
	// Saved first, so a failing check still leaves the screen to look at.
	if (savingScreens(testInfo))
		await saveScreen(page, testInfo, name, { ...save, viewport: undefined });
	if (typeof a11y === 'function') await a11y(page);
	else if (a11y !== false) await expectAccessible(page, { ...a11y, testInfo });
	if (horizontalScroll) {
		await expectNoHorizontalScroll(page, {
			max,
			scroller: typeof scroller === 'function' ? scroller(testInfo) : scroller,
		});
	}
	const texts =
		typeof textOverflow === 'function' ? textOverflow(testInfo) : textOverflow;
	if (texts) {
		await expectNoTextOverflow(
			page,
			texts === true ? { max } : { ...texts, max: texts.max ?? max },
		);
	}
	const taps =
		typeof tapTargets === 'function' ? tapTargets(testInfo) : tapTargets;
	if (taps) {
		await expectTapTargets(
			page,
			taps === true ? { max } : { ...taps, max: taps.max ?? max },
		);
	}
}

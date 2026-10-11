import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Page, PageScreenshotOptions, TestInfo } from '@playwright/test';
import { nextFrames, settled } from '../helpers/frames';
import { screensDir, screensMetadata } from './dir';

export type SaveScreenOptions = {
	/**
	 * The screens folder, relative to the config file. Default the one
	 * `defineAppConfig`'s `screens` set, else `./playwright/screenshots`.
	 */
	dir?: string;
	/**
	 * How many times the viewport may grow to show nested scrolling content.
	 * Default `5`.
	 */
	maxGrowth?: number;
	/** Passed to `page.screenshot`, over the defaults. */
	screenshot?: Omit<PageScreenshotOptions, 'path'>;
};

/** Whether this run saves screens: `defineAppConfig`'s `screens` variable is `1`. */
export function savingScreens(testInfo: TestInfo): boolean {
	return screensMetadata(testInfo.config)?.enabled === true;
}

/**
 * How much taller than it shows the tallest inner scroll container's content
 * is. Only a box at least 200px tall counts: a short one (a list in a card)
 * is part of the design, not the page's scroll.
 */
function hiddenHeight(page: Page): Promise<number> {
	return page.evaluate(() => {
		let hidden = 0;
		for (const element of document.querySelectorAll<HTMLElement>('body *')) {
			if (element.clientHeight < 200) continue;
			if (!/auto|scroll/.test(getComputedStyle(element).overflowY)) continue;
			hidden = Math.max(hidden, element.scrollHeight - element.clientHeight);
		}
		return hidden;
	});
}

/**
 * Saves the whole page as `<dir>/<project name>/<name>.png` (a project
 * without a name: `default`; `name` may hold folders) and returns the file's
 * path. An app shell as tall as the viewport, whose content scrolls
 * inside it, stops a plain full-page screenshot at the fold: the viewport is
 * stretched until no inner scroll container hides anything, the shot taken,
 * then the viewport put back and the page left to settle.
 *
 * Animations are finished and disabled and the caret hidden; the rest (data,
 * clock, motion) is as deterministic as the spec makes it.
 */
export async function saveScreen(
	page: Page,
	testInfo: TestInfo,
	name: string,
	{ dir, maxGrowth = 5, screenshot }: SaveScreenOptions = {},
): Promise<string> {
	const path = join(
		screensDir(testInfo.config, dir),
		testInfo.project.name || 'default',
		`${name}.png`,
	);
	// A `name` may hold folders of its own: `auth/sign-in`.
	mkdirSync(dirname(path), { recursive: true });
	const viewport = page.viewportSize();
	await settled(page);
	try {
		for (let i = 0, size = viewport; size && i < maxGrowth; i++) {
			const hidden = await hiddenHeight(page);
			if (hidden <= 1) break;
			size = { ...size, height: size.height + hidden };
			await page.setViewportSize(size);
			// Measured again once laid out at the new size: earlier, the same
			// hidden height would be added twice.
			await nextFrames(page);
		}
		await page.screenshot({
			fullPage: true,
			animations: 'disabled',
			caret: 'hide',
			...screenshot,
			path,
		});
	} finally {
		if (viewport) {
			await page.setViewportSize(viewport);
			// What reacts to a resize (a menu placed against its trigger)
			// settles before the spec reads the page again.
			await nextFrames(page);
			await settled(page);
		}
	}
	return path;
}

import { expect, type Page } from '@playwright/test';
import { screenshotName } from '../helpers/screenshot-name';

export type BasePageOptions = {
	/** Where `screenshot()` writes. Default `playwright/screenshots`. */
	screenshotDir?: string;
};

export type PageScreenshotOptions = Parameters<Page['screenshot']>[0] & {
	/** Appended to the file name: `<path>-<suffix>.png`. */
	suffix?: string;
};

export const DEFAULT_SCREENSHOT_DIR = 'playwright/screenshots';

/**
 * A page object bound to one path. Extend it once per screen:
 *
 * ```ts
 * export class ProjectsPage extends BasePage {
 * 	constructor(page: Page) {
 * 		super(page, '/projects');
 * 	}
 * }
 * ```
 */
export class BasePage {
	readonly page: Page;
	readonly path: string;
	readonly screenshotDir: string;

	constructor(page: Page, path: string, options: BasePageOptions = {}) {
		this.page = page;
		this.path = path;
		this.screenshotDir = options.screenshotDir ?? DEFAULT_SCREENSHOT_DIR;
	}

	goto() {
		return this.page.goto(this.path);
	}

	waitForTimeout(ms: number) {
		return this.page.waitForTimeout(ms);
	}

	waitForURL(url: RegExp | string) {
		return this.page.waitForURL(url);
	}

	expectTitle(title: RegExp | string) {
		return expect(this.page).toHaveTitle(title);
	}

	/**
	 * Saves `<screenshotDir>/<path as a slug>[-<suffix>].png`. `options.path`,
	 * when given, replaces the page path in the name, not the directory.
	 */
	screenshot({ suffix, path, ...options }: PageScreenshotOptions = {}) {
		const name = screenshotName(path ?? this.path, suffix);
		return this.page.screenshot({
			...options,
			path: `${this.screenshotDir}/${name}.png`,
		});
	}
}

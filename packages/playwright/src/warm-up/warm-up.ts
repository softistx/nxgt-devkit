import { chromium, type FullConfig, type Page } from '@playwright/test';
import {
	DEFAULT_HYDRATION_MARKER,
	type HydrationMarker,
} from '../helpers/hydration';

/** `defineAppConfig`'s `warmUp` option, and what {@link warmUp} takes. */
export type WarmUpOptions = {
	/** The page to open, relative to the base URL. Default `/`. */
	path?: string;
	/** Give up after this long in all. Default `180_000`. */
	timeout?: number;
	/** Reload a page that has not hydrated after this long. Default `15_000`. */
	reloadEvery?: number;
	/**
	 * What tells the page has hydrated, the same marker as `withHydration`'s.
	 * Default `html[data-hydrated]`. A function marker is read in the runner's
	 * process only, which is where a global setup runs.
	 */
	marker?: HydrationMarker;
};

export const DEFAULT_WARM_UP_TIMEOUT = 180_000;
export const DEFAULT_WARM_UP_RELOAD_EVERY = 15_000;
/** The longest a single navigation may take. */
const NAVIGATION_TIMEOUT = 60_000;

/** The part of a page the loop uses, so a fake one can stand in. */
export type WarmUpPage = Pick<Page, 'goto' | 'waitForFunction'>;

type Loop = Required<Omit<WarmUpOptions, 'path'>> & {
	url: string;
	now?: () => number;
};

/**
 * Opens `url` and reloads it until the marker holds. The deadline is checked
 * before each navigation; a navigation that fails (a 504, a refused
 * connection) counts as a page that has not hydrated.
 */
export async function warmUpPage(page: WarmUpPage, loop: Loop): Promise<void> {
	const { url, marker, timeout, reloadEvery, now = Date.now } = loop;
	const deadline = now() + timeout;
	let attempts = 0;
	let last = '';
	for (;;) {
		if (now() >= deadline) {
			throw new Error(
				`warm-up: ${url} did not hydrate within ${timeout}ms ` +
					`(${attempts} attempt${attempts === 1 ? '' : 's'}, marker: ${
						typeof marker === 'string' ? marker : 'a function'
					}). The dev server may still be optimizing dependencies, or the app ` +
					`never sets the marker.${last ? `\nLast error: ${last}` : ''}`,
			);
		}
		attempts += 1;
		await page
			.goto(url, { timeout: Math.min(NAVIGATION_TIMEOUT, deadline - now()) })
			.catch((error: Error) => {
				last = error.message;
			});
		try {
			if (typeof marker === 'string') {
				await page.waitForFunction(
					(selector) => document.querySelector(selector) !== null,
					marker,
					{ timeout: reloadEvery },
				);
			} else {
				await page.waitForFunction(marker, undefined, { timeout: reloadEvery });
			}
			return;
		} catch (error) {
			last = (error as Error).message;
		}
	}
}

/**
 * Opens a page of a cold dev server in Chromium and reloads it until it
 * hydrates, so the first spec meets a warm server. Vite answers 504 "Outdated
 * Optimize Dep" to the first page while it optimizes dependencies, and that
 * page never hydrates; a reload does. Call it from a `globalSetup` of your
 * own when `defineAppConfig`'s `warmUp` option does not fit. The browser is
 * closed whatever happens.
 *
 * ```ts
 * export default (config: FullConfig) =>
 *   warmUp(config.projects[0].use.baseURL!, { path: '/sign-in' });
 * ```
 */
export async function warmUp(
	baseURL: string,
	options: WarmUpOptions = {},
): Promise<void> {
	const url = new URL(options.path ?? '/', baseURL).href;
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await warmUpPage(page, {
			url,
			marker: options.marker ?? DEFAULT_HYDRATION_MARKER,
			timeout: options.timeout ?? DEFAULT_WARM_UP_TIMEOUT,
			reloadEvery: options.reloadEvery ?? DEFAULT_WARM_UP_RELOAD_EVERY,
		});
	} finally {
		await browser.close();
	}
}

export const WARM_UP_METADATA_KEY = 'nxgtWarmUp';

/** The base URL a global setup can find in the loaded config. */
export function configBaseURL(
	config: Pick<FullConfig, 'projects'>,
): string | undefined {
	return config.projects.find((project) => project.use.baseURL)?.use.baseURL;
}

import { expect, type Page } from '@playwright/test';

/**
 * Throws, naming the page, when it has no Cache Storage: `about:blank`, a
 * `page.setContent` document or a page on a non-secure origin.
 */
async function requireCacheStorage(page: Page, caller: string): Promise<void> {
	// An opaque origin (about:blank, a data: URL) may have `caches` but
	// refuses every call on it.
	const available = await page.evaluate(
		() => typeof caches !== 'undefined' && location.origin !== 'null',
	);
	if (!available) {
		throw new Error(
			`${caller}: ${page.url()} has no Cache Storage. Open a page of the app first, ` +
				'on a secure origin (https, or http://localhost); about:blank and page.setContent have none.',
		);
	}
}

/**
 * Every URL in every Cache Storage cache of the page's origin, by cache name.
 * A URL of the page's origin is given as path and query (`/assets/app.js`,
 * `/manifest.webmanifest?lang=fr`); another origin's in full.
 */
export async function cachedUrls(
	page: Page,
): Promise<Record<string, string[]>> {
	await requireCacheStorage(page, 'cachedUrls');
	return page.evaluate(async () => {
		const entries: Record<string, string[]> = {};
		for (const name of await caches.keys()) {
			const cache = await caches.open(name);
			entries[name] = (await cache.keys()).map((request) => {
				const url = new URL(request.url);
				return url.origin === location.origin
					? url.pathname + url.search
					: url.href;
			});
		}
		return entries;
	});
}

/**
 * Fails when any cache holds `url` — a path and query as `cachedUrls` gives
 * them, or a pattern — naming the caches that do. For what must never be
 * kept: a signed-in page, an API answer, a file behind a session.
 */
export async function expectNotCached(
	page: Page,
	url: string | RegExp,
): Promise<void> {
	const matches = (entry: string) =>
		typeof url === 'string' ? entry === url : url.test(entry);
	const holding = Object.entries(await cachedUrls(page))
		.map(([name, urls]) => [name, urls.filter(matches)] as const)
		.filter(([, urls]) => urls.length > 0);
	expect(
		holding,
		`${String(url)} is cached: ${holding
			.map(([name, urls]) => `${name} (${urls.join(', ')})`)
			.join('; ')}`,
	).toEqual([]);
}

/** The URL `fillCaches` puts in the cache `name`. */
export function filledCacheUrl(name: string): string {
	return `/__nxgt-filled/${encodeURIComponent(name)}`;
}

/**
 * Opens each named cache in the page's Cache Storage and puts one entry in it
 * (`/__nxgt-filled/<name>`), so a spec can check what a sign-out, a reset or
 * a new worker's `activate` leaves — where no worker runs (a dev server) or
 * before it has cached anything.
 */
export async function fillCaches(
	page: Page,
	names: readonly string[],
): Promise<void> {
	await requireCacheStorage(page, 'fillCaches');
	const entries = names.map((name) => [name, filledCacheUrl(name)] as const);
	await page.evaluate(async (entries) => {
		for (const [name, url] of entries) {
			await (await caches.open(name)).put(url, new Response(name));
		}
	}, entries);
}

/**
 * A cache name to keep: exactly this name (which must then be there), any
 * name a pattern matches, or any name a predicate accepts.
 */
export type CacheMatcher = string | RegExp | ((name: string) => boolean);

/**
 * What `expectOnlyCaches` finds wrong with `names`: the caches no matcher
 * keeps, and the exact names (string matchers) that are not there.
 */
export function cacheProblems(
	names: readonly string[],
	keep: CacheMatcher | readonly CacheMatcher[],
): { unexpected: string[]; missing: string[] } {
	const matchers: readonly CacheMatcher[] = Array.isArray(keep)
		? keep
		: [keep as CacheMatcher];
	const kept = (name: string) =>
		matchers.some((matcher) =>
			typeof matcher === 'string'
				? matcher === name
				: matcher instanceof RegExp
					? matcher.test(name)
					: matcher(name),
		);
	return {
		unexpected: names.filter((name) => !kept(name)),
		missing: matchers.filter(
			(matcher): matcher is string =>
				typeof matcher === 'string' && !names.includes(matcher),
		),
	};
}

/**
 * Fails unless the page's Cache Storage holds only the caches `keep` names:
 * any other cache is one that should have been deleted, and a cache named
 * by an exact string must be there. For what a sign-out or a worker's
 * `activate` must leave: the precache, say, and nothing else.
 */
export async function expectOnlyCaches(
	page: Page,
	keep: CacheMatcher | readonly CacheMatcher[],
): Promise<void> {
	await requireCacheStorage(page, 'expectOnlyCaches');
	const names = await page.evaluate(() => caches.keys());
	const { unexpected, missing } = cacheProblems(names, keep);
	const reasons = [
		unexpected.length && `caches left: ${unexpected.join(', ')}`,
		missing.length && `caches missing: ${missing.join(', ')}`,
	].filter(Boolean);
	expect(
		{ unexpected, missing },
		`Unexpected Cache Storage (${reasons.join('; ')}); present: ${
			names.join(', ') || 'none'
		}`,
	).toEqual({ unexpected: [], missing: [] });
}

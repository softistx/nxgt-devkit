import type {
	Fixtures,
	Page,
	PlaywrightTestArgs,
	TestType,
} from '@playwright/test';
import { nextFrames } from './frames';

/**
 * What tells a page has hydrated: a CSS selector that matches once it has, or
 * a function run in the page that returns a truthy value once it has. The
 * function is serialised into the page, so it may use nothing from the
 * test's scope.
 */
export type HydrationMarker = string | (() => unknown);

/**
 * The default marker: `<html data-hydrated>`, which the app sets in an effect
 * of its root component, after hydration:
 *
 * ```tsx
 * useEffect(() => { document.documentElement.dataset.hydrated = ''; }, []);
 * ```
 */
export const DEFAULT_HYDRATION_MARKER = 'html[data-hydrated]';

export type HydrationOptions = {
	/** Default {@link DEFAULT_HYDRATION_MARKER}. */
	marker?: HydrationMarker;
	/** Give up after this long. Default `15_000`. */
	timeout?: number;
};

/**
 * Resolves once the page is hydrated — its marker holds — and two frames
 * later, so the effects of that first render have run.
 *
 * Before that, a server-rendered control is visible and clickable but inert:
 * Playwright clicks it, and the click is lost (a checkbox that never
 * toggles, a menu that never opens, a form posted natively). A slower
 * project — an emulated phone, a loaded CI runner — hydrates late enough to
 * lose them.
 */
export async function hydrated(
	page: Page,
	{
		marker = DEFAULT_HYDRATION_MARKER,
		timeout = 15_000,
	}: HydrationOptions = {},
): Promise<void> {
	const waiting =
		typeof marker === 'string'
			? page.waitForFunction(
					(selector) => document.querySelector(selector) !== null,
					marker,
					{ timeout },
				)
			: page.waitForFunction(marker, undefined, { timeout });
	await waiting.catch((error: Error) => {
		throw new Error(
			`${page.url()} was not hydrated after ${timeout}ms (marker: ${
				typeof marker === 'string' ? marker : 'a function'
			}). Look for a client error in the console, a module that failed to ` +
				'load, or an app that never sets the marker.\n' +
				error.message,
		);
	});
	await nextFrames(page);
}

/** Whether a `goto` landed on a document, the only thing that hydrates. */
function isDocument(
	response: Awaited<ReturnType<Page['goto']>>,
	url: string,
): boolean {
	// No response: a same-document navigation (the page is still the app's),
	// or `about:blank` and `data:` URLs, which never hydrate.
	if (!response) return /^https?:/.test(url);
	const type = response.headers()['content-type'] ?? '';
	return type.includes('text/html') || type.includes('xhtml');
}

const PATCHED = Symbol.for('@nxgt/playwright/hydrated-goto');

function patchGoto(page: Page, options: HydrationOptions): void {
	const patched = page as Page & { [PATCHED]?: true };
	if (patched[PATCHED]) return;
	patched[PATCHED] = true;
	const goto = page.goto.bind(page);
	page.goto = async (...args: Parameters<Page['goto']>) => {
		const response = await goto(...args);
		if (isDocument(response, page.url())) await hydrated(page, options);
		return response;
	};
}

/** The fixture {@link withHydration} adds: `false` turns the wait off. */
export type HydrationFixture = { hydration: HydrationOptions | false };

/**
 * Extends a `test` so that `page.goto` on every page of the context — the
 * `page` fixture, `context.newPage()`, a page object's `goto()` — resolves
 * once the page it opened is {@link hydrated}. A response that is not a
 * document (`/manifest.webmanifest`, an image), `about:blank` and a `data:`
 * URL are returned without waiting.
 *
 * ```ts
 * export const test = withHydration(base);
 * test.use({ hydration: false }); // a block against a page that never hydrates
 * ```
 */
export function withHydration<T extends PlaywrightTestArgs, W extends object>(
	test: TestType<T, W>,
	options: HydrationOptions = {},
) {
	// Written out and cast once: TypeScript cannot resolve `Fixtures<…>`'s
	// mapped type while `T` is still generic.
	const fixtures = {
		hydration: [options, { option: true }],
		context: async (
			{
				context,
				hydration,
			}: { context: PlaywrightTestArgs['context'] } & HydrationFixture,
			use: (context: PlaywrightTestArgs['context']) => Promise<void>,
		) => {
			if (hydration) {
				for (const page of context.pages()) patchGoto(page, hydration);
				context.on('page', (page) => patchGoto(page, hydration));
			}
			await use(context);
		},
	};
	return test.extend<HydrationFixture>(
		fixtures as unknown as Fixtures<HydrationFixture, object, T, W>,
	);
}

/**
 * Collects, from now on, what the page reports about a hydration that did not
 * match the server's HTML: console errors and warnings, and uncaught errors,
 * that mention hydration or a mismatch. Call it before `goto`, read the array
 * after. A text rendered from the clock or the locale is the usual cause.
 *
 * ```ts
 * const warnings = hydrationWarnings(page);
 * await page.goto('/projects');
 * expect(warnings).toEqual([]);
 * ```
 */
export function hydrationWarnings(page: Page): string[] {
	const warnings: string[] = [];
	const about = /hydrat|did(n't| not) match|mismatch/i;
	page.on('console', (message) => {
		// Errors and warnings only: Firefox also reports `console.timeStamp`
		// marks such as "Hydrated".
		if (message.type() !== 'error' && message.type() !== 'warning') return;
		if (about.test(message.text())) warnings.push(message.text());
	});
	page.on('pageerror', (error) => {
		if (about.test(error.message)) warnings.push(error.message);
	});
	return warnings;
}

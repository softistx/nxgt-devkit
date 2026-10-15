import type { StorybookBrowser } from '@nxgt/playwright/storybook';

export type Browser = StorybookBrowser;

const known: readonly string[] = ['chromium', 'firefox', 'webkit'];

/** The browsers named by STORYBOOK_BROWSERS (comma-separated), chromium by default. */
export function fixtureBrowsers(
	value = process.env.STORYBOOK_BROWSERS,
): Browser[] {
	const names = (value ?? '')
		.split(',')
		.map((name) => name.trim())
		.filter(Boolean);
	if (names.length === 0) return ['chromium'];
	const unknown = names.filter((name) => !known.includes(name));
	if (unknown.length > 0)
		throw new Error(
			`STORYBOOK_BROWSERS: unknown browser ${unknown.map((n) => `"${n}"`).join(', ')}; expected ${known.join(', ')}`,
		);
	return names as Browser[];
}

/**
 * The browser that captures the WebP previews: chromium when the run includes
 * it, else firefox. WebKit cannot encode WebP, so a run with neither captures
 * nothing (undefined).
 */
export function captureBrowser(
	browsers: readonly Browser[] = fixtureBrowsers(),
): 'chromium' | 'firefox' | undefined {
	if (browsers.includes('chromium')) return 'chromium';
	if (browsers.includes('firefox')) return 'firefox';
	return undefined;
}

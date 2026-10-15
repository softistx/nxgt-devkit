export type Browser = 'chromium' | 'firefox' | 'webkit';

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

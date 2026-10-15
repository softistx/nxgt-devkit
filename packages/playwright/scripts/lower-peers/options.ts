/** What one run measures: exactly one of the three legs. */
export type Options =
	| { leg: 'msw'; msw: string; mswPlaywright: string }
	| { leg: 'playwright'; playwright: string; grep: string | undefined }
	| { leg: 'storybook'; vitest: string; storybook: string; vite: string };

/**
 * Reads the command line and refuses a combination that no leg uses, before
 * anything is created on disk.
 */
export function parseOptions(args: string[]): Options {
	// `--name value` options are taken out of the positional msw versions.
	const taken = new Set<number>();
	const option = (name: string) => {
		const at = args.indexOf(name);
		if (at === -1) return undefined;
		const value = args[at + 1];
		if (!value) throw new Error(`${name} needs a value`);
		taken.add(at).add(at + 1);
		return value;
	};
	const playwright = option('--playwright');
	const vitest = option('--vitest');
	const storybook = option('--storybook');
	const viteOption = option('--vite');
	if (Boolean(vitest) !== Boolean(storybook)) {
		throw new Error('--vitest and --storybook go together');
	}
	if (viteOption && !vitest) throw new Error('--vite goes with --vitest');
	if (vitest && playwright) {
		throw new Error('--vitest and --playwright are separate legs: run one');
	}
	// With `--playwright`, runs only the e2e tests whose title matches (to
	// bisect a floor); the unit and mock-server steps are skipped.
	const grep = option('--grep');
	if (grep && !playwright) throw new Error('--grep goes with --playwright');
	const positional = args.filter((_, i) => !taken.has(i));
	if (positional.length > 0 && (vitest || playwright)) {
		throw new Error(
			'msw versions (positional) belong to the msw leg: drop them, or drop --vitest and --playwright',
		);
	}
	if (vitest && storybook) {
		return {
			leg: 'storybook',
			vitest,
			storybook,
			vite: viteOption ?? '7.3.7',
		};
	}
	if (playwright) return { leg: 'playwright', playwright, grep };
	const [msw = '2.12.10', mswPlaywright = '0.6.7'] = positional;
	return { leg: 'msw', msw, mswPlaywright };
}

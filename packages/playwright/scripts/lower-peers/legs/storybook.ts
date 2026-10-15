import type { Context, Leg, LegOptions } from './types';

/** The floors of `@nxgt/playwright/storybook`'s vitest and storybook peers. */
export function storybookLeg(
	{ pkg, manifest, run, installed }: Context,
	{ vitest, storybook, vite }: LegOptions<'storybook'>,
): Leg {
	return {
		label: `vitest ${vitest}, addon-vitest ${storybook}, vite ${vite}`,
		rewrite: async () => {
			const dev = manifest.devDependencies;
			dev.vitest = vitest;
			dev['@vitest/browser-playwright'] = vitest;
			dev['@storybook/addon-vitest'] = storybook;
			dev.storybook = storybook;
			dev['@storybook/html-vite'] = storybook;
			dev.vite = vite;
		},
		steps: async () => {
			await run('storybook unit specs', pkg, 'bun', 'test', 'src/storybook');
			await run('storybook fixture', pkg, 'bun', 'test', './test/storybook/');
		},
		ok: async () =>
			`vitest ${await installed('vitest')}, @storybook/addon-vitest ${await installed('@storybook/addon-vitest')}, storybook ${await installed('storybook')}, vite ${await installed('vite')}`,
	};
}

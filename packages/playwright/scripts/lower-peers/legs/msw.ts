import type { Context, Leg, LegOptions } from './types';

/** The lowest msw and `@msw/playwright` the peer ranges accept. */
export function mswLeg(
	{ pkg, manifest, run, installed }: Context,
	{ msw, mswPlaywright }: LegOptions<'msw'>,
): Leg {
	return {
		label: `msw ${msw}, @msw/playwright ${mswPlaywright}`,
		rewrite: async () => {
			manifest.devDependencies.msw = msw;
			manifest.devDependencies['@msw/playwright'] = mswPlaywright;
		},
		steps: async () => {
			await run(
				'msw specs',
				pkg,
				'bunx',
				'playwright',
				'test',
				'-c',
				'test/playwright.config.ts',
				'e2e/msw.pw.ts',
			);
		},
		ok: async () =>
			`msw ${await installed('msw')}, @msw/playwright ${await installed('@msw/playwright')}`,
	};
}

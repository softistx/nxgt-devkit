import { join } from 'node:path';
import type { Context, Leg, LegOptions } from './types';

/** The floor of the `@playwright/test` range. */
export function playwrightLeg(
	{ work, pkg, manifest, run, installed }: Context,
	{ playwright, grep }: LegOptions<'playwright'>,
): Leg {
	return {
		label: `@playwright/test ${playwright}`,
		rewrite: async () => {
			manifest.devDependencies['@playwright/test'] = playwright;
			// One Playwright pair across the workspace.
			const graphqlPath = join(work, 'packages', 'msw-graphql', 'package.json');
			const graphql = await Bun.file(graphqlPath).json();
			graphql.devDependencies['@playwright/test'] = playwright;
			await Bun.write(graphqlPath, `${JSON.stringify(graphql, null, '\t')}\n`);
			// `@axe-core/playwright` takes `playwright-core` as a peer, and the
			// lockfile holds the workspace's: a second copy, whose `Page` type is
			// not the one `@playwright/test` exports.
			const rootPath = join(work, 'package.json');
			const root = await Bun.file(rootPath).json();
			root.overrides = { ...root.overrides, 'playwright-core': playwright };
			await Bun.write(rootPath, `${JSON.stringify(root, null, '\t')}\n`);
		},
		steps: async () => {
			// The browser is keyed on the playwright version; the cache holds the
			// workspace's, not this one's.
			await run(
				'install Chromium',
				pkg,
				'bunx',
				'playwright',
				'install',
				'chromium-headless-shell',
			);
			if (!grep) await run('unit specs', pkg, 'bun', 'test', 'src');
			await run(
				'e2e specs',
				pkg,
				'bunx',
				'playwright',
				'test',
				'-c',
				'test/playwright.config.ts',
				...(grep ? ['-g', grep] : []),
			);
			if (!grep) {
				await run(
					'mock-server spec',
					pkg,
					'bunx',
					'playwright',
					'test',
					'-c',
					'test/playwright.mock-server.config.ts',
				);
			}
		},
		ok: async () => `@playwright/test ${await installed('@playwright/test')}`,
	};
}

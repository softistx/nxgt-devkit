#!/usr/bin/env bun

/**
 * Runs `@nxgt/playwright/msw`'s specs against the lowest msw and
 * `@msw/playwright` its peer ranges accept, in a scratch copy of the
 * workspace:
 *
 *   bun run scripts/test-lower-peers.ts                 # 2.12.10 and 0.6.7
 *   bun run scripts/test-lower-peers.ts 2.12.10 0.6.7   # the same, explicit
 *
 * The workspace holds msw 3 and `@msw/playwright` 0.7, and the peers promise
 * `msw ^2.12.10 || ^3` with `@msw/playwright >=0.6.7 <0.8`, so the other end
 * is measured here and in CI rather than assumed. Pass full versions: the
 * `ok:` line prints what was installed.
 *
 * The copy keeps `bun.lock`, so everything else stays at the version the
 * workspace tests (the Chromium in the shared browser cache included); only
 * the two peers move. It then builds, typechecks the package and runs
 * `test/e2e/msw.pw.ts`, the one spec that imports `./msw`.
 *
 *   bun run scripts/test-lower-peers.ts --playwright 1.61.1
 *
 * The other leg: `@playwright/test` is promised as `^1.61.0` and the workspace
 * holds a newer one, so the bottom of that range is measured the same way.
 * Only `@playwright/test` and `@nxgt/msw-graphql`'s copy of it move (msw stays
 * where the lockfile has it). This leg downloads its own browser, the
 * headless shell that version needs, into the shared cache (it is not the
 * workspace's), and the whole package runs: build, typecheck, the unit specs and both Playwright
 * configs. Pass the newest patch of the floor's minor. `--grep <title>` runs
 * only the e2e tests that match, to find which minor a failing one starts to
 * pass on.
 *
 *   bun run scripts/test-lower-peers.ts --vitest 4.0.18 --storybook 10.3.6
 *
 * The third leg measures `@nxgt/playwright/storybook`'s floors: `vitest` and
 * `@vitest/browser-playwright` move to `--vitest`, `@storybook/addon-vitest`,
 * `storybook` and `@storybook/html-vite` to `--storybook`, and `vite` to
 * `--vite` (default 7.3.7: vitest 4.0 accepts vite 6 or 7 only). Playwright
 * stays at the lockfile's, so the cached Chromium is used. It builds,
 * typechecks (a missing per-browser type fails here), runs `src/storybook`
 * and the `test/storybook/` fixture. Pass the newest patch of each floor.
 *
 * Modelled on `@nxgt/msw-graphql`'s `scripts/test-matrix.ts`.
 */

import { rmSync } from 'node:fs';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { $ } from 'bun';

const args = Bun.argv.slice(2);
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
const vite = viteOption ?? '7.3.7';
if (Boolean(vitest) !== Boolean(storybook)) {
	throw new Error('--vitest and --storybook go together');
}
if (viteOption && !vitest) throw new Error('--vite goes with --vitest');
if (vitest && playwright) {
	throw new Error('--vitest and --playwright are separate legs: run one');
}
// With `--playwright`, runs only the e2e tests whose title matches (to bisect
// a floor); the unit and mock-server steps are skipped.
const grep = option('--grep');
const [msw = '2.12.10', mswPlaywright = '0.6.7'] = args.filter(
	(_, i) => !taken.has(i),
);
const rootDir = new URL('../../..', import.meta.url).pathname.replace(
	/\/$/,
	'',
);

const SKIP = new Set([
	'node_modules',
	'dist',
	'.git',
	'.probe-results',
	'.probe-screens',
]);

const work = await mkdtemp(join(tmpdir(), 'playwright-lower-peers-'));
// A signal skips the `finally` below: remove the scratch folder, then die of
// the same signal so the exit status says so. Best effort: a child the signal
// did not reach may still write into the folder.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
	process.once(signal, () => {
		try {
			rmSync(work, {
				recursive: true,
				force: true,
				maxRetries: 3,
				retryDelay: 100,
			});
		} finally {
			process.kill(process.pid, signal);
		}
	});
}
try {
	await cp(rootDir, work, {
		recursive: true,
		filter: (source) => !SKIP.has(basename(source)),
	});
	const path = join(work, 'packages', 'playwright', 'package.json');
	const manifest = await Bun.file(path).json();
	// A leg is what differs between the runs: the manifest edits, the steps
	// after typecheck, and the final `ok:` line.
	type Leg = {
		label: string;
		rewrite: () => Promise<void>;
		steps: () => Promise<void>;
		ok: () => Promise<string>;
	};
	const legs: Record<'msw' | 'playwright' | 'storybook', Leg> = {
		playwright: {
			label: `@playwright/test ${playwright}`,
			rewrite: async () => {
				manifest.devDependencies['@playwright/test'] = playwright;
				// One Playwright pair across the workspace.
				const graphqlPath = join(
					work,
					'packages',
					'msw-graphql',
					'package.json',
				);
				const graphql = await Bun.file(graphqlPath).json();
				graphql.devDependencies['@playwright/test'] = playwright;
				await Bun.write(
					graphqlPath,
					`${JSON.stringify(graphql, null, '\t')}\n`,
				);
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
		},
		storybook: {
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
		},
		msw: {
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
		},
	};
	const leg = vitest ? legs.storybook : playwright ? legs.playwright : legs.msw;
	await leg.rewrite();
	await Bun.write(path, `${JSON.stringify(manifest, null, '\t')}\n`);

	// A failed step throws: `process.exit` here would skip the `finally` and
	// leave the scratch copy behind.
	const run = async (step: string, cwd: string, ...command: string[]) => {
		console.log(`\n[${leg.label}] ${step}`);
		const result = await $`${command}`.cwd(cwd).nothrow();
		if (result.exitCode !== 0) {
			process.exitCode = result.exitCode;
			throw new Error(`${step} failed (${result.exitCode})`);
		}
	};
	const pkg = join(work, 'packages', 'playwright');
	await run('install', work, 'bun', 'install');
	await run('build', work, 'bun', 'run', 'build');
	await run('typecheck', pkg, 'bunx', 'tsc', '--noEmit');
	await leg.steps();
	const installed = async (name: string) =>
		(await Bun.file(join(pkg, 'node_modules', name, 'package.json')).json())
			.version;
	console.log(`\nok: ${await leg.ok()}`);
} finally {
	await rm(work, { recursive: true, force: true });
}

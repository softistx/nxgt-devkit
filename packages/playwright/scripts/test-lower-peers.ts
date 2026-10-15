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
	if (playwright) {
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
	} else {
		manifest.devDependencies.msw = msw;
		manifest.devDependencies['@msw/playwright'] = mswPlaywright;
	}
	await Bun.write(path, `${JSON.stringify(manifest, null, '\t')}\n`);

	const label = playwright
		? `@playwright/test ${playwright}`
		: `msw ${msw}, @msw/playwright ${mswPlaywright}`;
	// A failed step throws: `process.exit` here would skip the `finally` and
	// leave the scratch copy behind.
	const run = async (step: string, cwd: string, ...command: string[]) => {
		console.log(`\n[${label}] ${step}`);
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
	if (playwright) {
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
	} else {
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
	}
	const installed = async (name: string) =>
		(await Bun.file(join(pkg, 'node_modules', name, 'package.json')).json())
			.version;
	console.log(
		playwright
			? `\nok: @playwright/test ${await installed('@playwright/test')}`
			: `\nok: msw ${await installed('msw')}, @msw/playwright ${await installed('@msw/playwright')}`,
	);
} finally {
	await rm(work, { recursive: true, force: true });
}

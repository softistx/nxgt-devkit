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
 * Modelled on `@nxgt/msw-graphql`'s `scripts/test-matrix.ts`.
 */

import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { $ } from 'bun';

const [msw = '2.12.10', mswPlaywright = '0.6.7'] = Bun.argv.slice(2);
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
try {
	await cp(rootDir, work, {
		recursive: true,
		filter: (source) => !SKIP.has(basename(source)),
	});
	const path = join(work, 'packages', 'playwright', 'package.json');
	const manifest = await Bun.file(path).json();
	manifest.devDependencies.msw = msw;
	manifest.devDependencies['@msw/playwright'] = mswPlaywright;
	await Bun.write(path, `${JSON.stringify(manifest, null, '\t')}\n`);

	const label = `msw ${msw}, @msw/playwright ${mswPlaywright}`;
	const run = async (step: string, cwd: string, ...command: string[]) => {
		console.log(`\n[${label}] ${step}`);
		const result = await $`${command}`.cwd(cwd).nothrow();
		if (result.exitCode !== 0) {
			console.error(`${step} failed (${result.exitCode})`);
			process.exit(result.exitCode);
		}
	};
	const pkg = join(work, 'packages', 'playwright');
	await run('install', work, 'bun', 'install');
	await run('build', work, 'bun', 'run', 'build');
	await run('typecheck', pkg, 'bunx', 'tsc', '--noEmit');
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
	const installed = async (name: string) =>
		(await Bun.file(join(pkg, 'node_modules', name, 'package.json')).json())
			.version;
	console.log(
		`\nok: msw ${await installed('msw')}, @msw/playwright ${await installed('@msw/playwright')}`,
	);
} finally {
	await rm(work, { recursive: true, force: true });
}

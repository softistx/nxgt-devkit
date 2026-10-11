#!/usr/bin/env bun

/**
 * Runs this package's whole green bar against one graphql and one msw version
 * other than the workspace's, in a scratch copy:
 *
 *   bun run scripts/test-matrix.ts 16 3.0.3   # graphql 16, msw 3.0.3
 *   bun run scripts/test-matrix.ts 17 2.15.0  # graphql 17, msw 2.15.0
 *
 * Pass full versions: the `ok:` line prints what was installed, and a range
 * such as `^2` leaves room to doubt it. On msw 2 the copy also runs
 * `scripts/bun-fetch-probe.ts --expect intercepted`.
 *
 * The workspace holds one version of each (graphql 17, msw 3), and the peers
 * promise `graphql ^16 || ^17`, so the other majors are measured here and in
 * CI's matrix rather than assumed. The copy gets its own `bun install`, a
 * build, `bun test src` and the Node smoke test.
 */

import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'bun';

const [graphql = '16', msw = '3'] = Bun.argv.slice(2);
const pkgDir = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const rootDir = join(pkgDir, '..', '..');

const work = await mkdtemp(join(tmpdir(), 'msw-graphql-matrix-'));
const copy = join(work, 'packages', 'msw-graphql');
try {
	await mkdir(copy, { recursive: true });
	await cp(join(rootDir, 'build.ts'), join(work, 'build.ts'));
	await cp(
		join(rootDir, 'tsconfig.base.json'),
		join(work, 'tsconfig.base.json'),
	);
	for (const entry of [
		'src',
		'scripts',
		'test',
		'tsconfig.json',
		'tsconfig.build.json',
	]) {
		await cp(join(pkgDir, entry), join(copy, entry), { recursive: true });
	}
	const manifest = await Bun.file(join(pkgDir, 'package.json')).json();
	manifest.devDependencies.graphql = `^${graphql}`;
	manifest.devDependencies.msw = `^${msw}`;
	manifest.devDependencies.typescript = '~6.0.3';
	manifest.scripts.build = 'bun run ../../build.ts';
	await Bun.write(
		join(copy, 'package.json'),
		JSON.stringify(manifest, null, '\t'),
	);

	const run = async (label: string, ...command: string[]) => {
		console.log(`\n[graphql ${graphql}, msw ${msw}] ${label}`);
		const result = await $`${command}`.cwd(copy).nothrow();
		if (result.exitCode !== 0) {
			console.error(`${label} failed (${result.exitCode})`);
			process.exit(result.exitCode);
		}
	};
	await run('install', 'bun', 'install');
	await run('build', 'bun', 'run', 'build');
	await run('typecheck', 'bunx', 'tsc', '--noEmit');
	await run('bun test', 'bun', 'test', 'src');
	await run('node smoke', 'node', 'scripts/node-smoke.mjs');
	const installed = async (name: string) =>
		(await Bun.file(join(copy, 'node_modules', name, 'package.json')).json())
			.version;
	// msw 2 must see Bun's fetch (msw 3 does not): the probe fails the run
	// unless it prints `intercepted`, so a `^2` that resolved elsewhere shows.
	if ((await installed('msw')).startsWith('2.'))
		await run(
			'bun fetch probe',
			'bun',
			'run',
			'scripts/bun-fetch-probe.ts',
			'--expect',
			'intercepted',
		);
	console.log(
		`\nok: graphql ${await installed('graphql')}, msw ${await installed('msw')}`,
	);
} finally {
	await rm(work, { recursive: true, force: true });
}

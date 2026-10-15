import { rmSync } from 'node:fs';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { $ } from 'bun';
import { mswLeg } from './legs/msw';
import { playwrightLeg } from './legs/playwright';
import { storybookLeg } from './legs/storybook';
import type { Context, Leg } from './legs/types';
import { parseOptions } from './options';

const rootDir = new URL('../../../..', import.meta.url).pathname.replace(
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

/** Measures one leg in a scratch copy of the workspace; see `../test-lower-peers.ts`. */
export async function main(args: string[]): Promise<void> {
	// Refused before any scratch folder exists.
	const options = parseOptions(args);
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
		const pkg = join(work, 'packages', 'playwright');
		const path = join(pkg, 'package.json');
		const manifest = await Bun.file(path).json();
		let label = '';
		// A failed step throws: `process.exit` here would skip the `finally` and
		// leave the scratch copy behind.
		const run: Context['run'] = async (step, cwd, ...command) => {
			console.log(`\n[${label}] ${step}`);
			const result = await $`${command}`.cwd(cwd).nothrow();
			if (result.exitCode !== 0) {
				process.exitCode = result.exitCode;
				throw new Error(`${step} failed (${result.exitCode})`);
			}
		};
		const installed: Context['installed'] = async (name) =>
			(await Bun.file(join(pkg, 'node_modules', name, 'package.json')).json())
				.version;
		const context: Context = { work, pkg, manifest, run, installed };
		const leg: Leg =
			options.leg === 'storybook'
				? storybookLeg(context, options)
				: options.leg === 'playwright'
					? playwrightLeg(context, options)
					: mswLeg(context, options);
		label = leg.label;
		await leg.rewrite();
		await Bun.write(path, `${JSON.stringify(manifest, null, '\t')}\n`);

		await run('install', work, 'bun', 'install');
		await run('build', work, 'bun', 'run', 'build');
		await run('typecheck', pkg, 'bunx', 'tsc', '--noEmit');
		await leg.steps();
		console.log(`\nok: ${await leg.ok()}`);
	} finally {
		await rm(work, { recursive: true, force: true });
	}
}

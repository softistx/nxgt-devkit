import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// A real Vitest browser run of `storybookProject` from the BUILT package
// (`bun run build` first). `storybookTest` narrows each project's `include` to
// the stories, so Vitest never runs this file.

const fixture = import.meta.dir;
const out = join(fixture, '.probe-results', 'vitest.json');
const preview = join(fixture, '.probe-previews', 'fixture-button.webp');
const browsers = process.env.STORYBOOK_BROWSERS?.split(',') ?? ['chromium'];

type Assertion = {
	title: string;
	fullName: string;
	status: string;
	failureMessages?: string[];
};
type Report = { testResults: { assertionResults: Assertion[] }[] };

describe('storybookProject in a real Vitest browser run', () => {
	let report: Report;
	let exitCode: number;

	test('runs', async () => {
		rmSync(join(fixture, '.probe-results'), { recursive: true, force: true });
		rmSync(join(fixture, '.probe-previews'), { recursive: true, force: true });
		const run = Bun.spawn(
			[
				join(import.meta.dir, '../../node_modules/.bin/vitest'),
				'run',
				'--reporter=json',
				`--outputFile=${out}`,
			],
			{
				cwd: fixture,
				env: { ...process.env, STORYBOOK_DISABLE_TELEMETRY: '1', CI: '1' },
				stdout: 'pipe',
				stderr: 'pipe',
			},
		);
		const stderr = new Response(run.stderr).text();
		await new Response(run.stdout).text();
		exitCode = await run.exited;
		const err = await stderr;
		if (!existsSync(out))
			throw new Error(`no report (exit ${exitCode}):\n${err}`);
		report = JSON.parse(readFileSync(out, 'utf8'));
	}, 120_000);

	const all = () => report.testResults.flatMap((r) => r.assertionResults);
	const named = (story: string) =>
		all().filter((a) => a.title === story || a.fullName.includes(story));

	test('exits 1 because the expected-failure story fails', () => {
		expect(exitCode).toBe(1);
	});

	test('Rendered and Played pass once per browser', () => {
		for (const story of ['Rendered', 'Played']) {
			// The previews project runs only the `preview` tag, so not these.
			expect(named(story).filter((a) => a.status === 'passed')).toHaveLength(
				browsers.length,
			);
		}
	});

	test('Previewed passes once per browser, plus once in previews', () => {
		expect(
			named('Previewed').filter((a) => a.status === 'passed'),
		).toHaveLength(browsers.length + 1);
	});

	test('Broken fails once per browser with its message', () => {
		const runs = named('Broken');
		expect(runs).toHaveLength(browsers.length);
		for (const run of runs) {
			expect(run.status).toBe('failed');
			expect(run.failureMessages?.join('\n')).toContain(
				'Text that is not rendered anywhere',
			);
		}
	});

	test('nothing else fails', () => {
		const failed = all().filter((a) => a.status === 'failed');
		expect(failed.every((a) => a.fullName.includes('Broken'))).toBe(true);
	});

	test('the preview is a WebP file', () => {
		const bytes = readFileSync(preview);
		expect(bytes.subarray(0, 4).toString('latin1')).toBe('RIFF');
		expect(bytes.subarray(8, 12).toString('latin1')).toBe('WEBP');
	});
});

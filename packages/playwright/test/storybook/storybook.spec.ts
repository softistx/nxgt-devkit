import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { captureBrowser, fixtureBrowsers } from './browsers';

// A real Vitest browser run of `storybookProject` from the BUILT package
// (`bun run build` first). `storybookTest` narrows each project's `include` to
// the stories, so Vitest never runs this file.

const fixture = import.meta.dir;
const out = join(fixture, '.probe-results', 'vitest.json');
const preview = join(fixture, '.probe-previews', 'fixture-button.webp');
const browsers = fixtureBrowsers();
// The capture project runs in one browser that encodes WebP (chromium, else
// firefox): it writes the preview only when the run names one of them.
const captures = captureBrowser(browsers) !== undefined;
const vitest = join(import.meta.dir, '../../node_modules/.bin/vitest');

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

	test(
		'runs',
		async () => {
			rmSync(join(fixture, '.probe-results'), { recursive: true, force: true });
			rmSync(join(fixture, '.probe-previews'), {
				recursive: true,
				force: true,
			});
			// Node runs vitest (its bin is a node script), never `bun --bun`.
			if (!existsSync(vitest))
				throw new Error(`vitest not found at ${vitest}; run bun install`);
			const run = Bun.spawn(
				[vitest, 'run', '--reporter=json', `--outputFile=${out}`],
				{
					cwd: fixture,
					env: { ...process.env, STORYBOOK_DISABLE_TELEMETRY: '1', CI: '1' },
					stdout: 'pipe',
					stderr: 'pipe',
				},
			);
			try {
				const stderr = new Response(run.stderr).text();
				await new Response(run.stdout).text();
				exitCode = await run.exited;
				const err = await stderr;
				if (!existsSync(out))
					throw new Error(`no report (exit ${exitCode}):\n${err}`);
				report = JSON.parse(readFileSync(out, 'utf8'));
			} finally {
				// bun test's timeout rejects the test but leaves the child running.
				run.kill();
			}
		},
		120_000 * browsers.length,
	);

	const all = () => report.testResults.flatMap((r) => r.assertionResults);
	const named = (story: string) => all().filter((a) => a.title === story);

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

	test('Previewed passes once per browser, plus once in the previews project', () => {
		expect(
			named('Previewed').filter((a) => a.status === 'passed'),
		).toHaveLength(browsers.length + (captures ? 1 : 0));
	});

	test('Broken fails once per browser with its message', () => {
		const runs = named('Broken');
		const message = 'Text that is not rendered anywhere';
		expect(runs).toHaveLength(browsers.length);
		for (const run of runs) {
			expect(run.status).toBe('failed');
			// Firefox's and WebKit's stacks hold frames only, so per run the
			// failing story's file is the proof the failure came from its `play`.
			const trace = run.failureMessages?.join('\n') ?? '';
			expect(
				trace.includes(message) || trace.includes('broken.stories.ts'),
			).toBe(true);
		}
		// Chromium's stack starts with the message, so there it must show.
		if (browsers.includes('chromium')) {
			expect(
				runs.some((run) =>
					(run.failureMessages ?? []).join('\n').includes(message),
				),
			).toBe(true);
		}
	});

	test('nothing else fails', () => {
		const failed = all().filter((a) => a.status === 'failed');
		expect(failed.every((a) => a.fullName.includes('Broken'))).toBe(true);
	});

	test.skipIf(!captures)('the preview is a WebP file', () => {
		const bytes = readFileSync(preview);
		expect(bytes.subarray(0, 4).toString('latin1')).toBe('RIFF');
		expect(bytes.subarray(8, 12).toString('latin1')).toBe('WEBP');
	});
});

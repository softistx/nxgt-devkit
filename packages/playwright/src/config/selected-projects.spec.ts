import { describe, expect, test } from 'bun:test';
import {
	PROJECTS_ENV,
	projectsFromArgv,
	selectedProjects,
} from './selected-projects';

describe('projectsFromArgv', () => {
	test('reads both spellings, in order', () => {
		expect(
			projectsFromArgv([
				'node',
				'playwright',
				'test',
				'--project',
				'chromium',
				'--project=pwa',
				'e2e/home.spec.ts',
			]),
		).toEqual(['chromium', 'pwa']);
	});

	test('ignores a --project with no name after it', () => {
		expect(projectsFromArgv(['test', '--project', '--headed'])).toEqual([]);
		expect(projectsFromArgv(['test', '--project'])).toEqual([]);
	});
});

describe('selectedProjects', () => {
	test('in the runner: reads the command line and leaves it for the workers', () => {
		const env: NodeJS.ProcessEnv = {};
		expect(selectedProjects(['test', '--project=pwa'], env)).toEqual(['pwa']);
		expect(env[PROJECTS_ENV]).toBe('["pwa"]');
	});

	test('in the runner without --project: clears a value left by a parent', () => {
		const env: NodeJS.ProcessEnv = { [PROJECTS_ENV]: '["pwa"]' };
		expect(selectedProjects(['test'], env)).toEqual([]);
		expect(env[PROJECTS_ENV]).toBeUndefined();
	});

	test("in a worker: reads the runner's answer, not its own argv", () => {
		const env: NodeJS.ProcessEnv = {
			TEST_WORKER_INDEX: '0',
			[PROJECTS_ENV]: '["a,b","pwa"]',
		};
		expect(selectedProjects(['worker.js'], env)).toEqual(['a,b', 'pwa']);
		expect(selectedProjects(['worker.js'], { TEST_WORKER_INDEX: '0' })).toEqual(
			[],
		);
	});
});

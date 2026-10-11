/** The variable the runner leaves the selected projects in, for its workers. */
export const PROJECTS_ENV = 'PW_PROJECTS';

/**
 * The project names a Playwright command line selects: every
 * `--project <name>` and `--project=<name>`, in order, as written (a
 * wildcard such as `*chromium` is returned as is).
 */
export function projectsFromArgv(argv: readonly string[]): string[] {
	const names: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i] ?? '';
		if (arg === '--project') {
			const next = argv[i + 1];
			if (next !== undefined && !next.startsWith('-')) {
				names.push(next);
				i++;
			}
		} else if (arg.startsWith('--project=')) {
			names.push(arg.slice('--project='.length));
		}
	}
	return names;
}

/**
 * The projects the command line selected (`--project`), or `[]` when it
 * selected none (every project runs) — the same answer in the runner and in
 * its workers.
 *
 * Playwright's workers load the config again, without the command line: a
 * config that branches on `process.argv` builds one thing in the runner and
 * another in each worker. The runner's answer is written to `PW_PROJECTS` (a
 * JSON array), which the workers inherit and read instead. `defineAppConfig`
 * calls it too, so the variable is always there for a spec to read.
 *
 * It reads the command line only: UI mode and editor extensions pick projects
 * without `--project`, and give `[]`.
 *
 * ```ts
 * const pwa = selectedProjects().includes('pwa');
 * export default defineAppConfig({ port: pwa ? 5274 : 5273, … });
 * ```
 */
export function selectedProjects(
	argv: readonly string[] = process.argv,
	env: NodeJS.ProcessEnv = process.env,
): string[] {
	// `TEST_WORKER_INDEX` is set in a worker only.
	if (env.TEST_WORKER_INDEX !== undefined) {
		try {
			const names: unknown = JSON.parse(env[PROJECTS_ENV] ?? '[]');
			return Array.isArray(names) ? names.map(String) : [];
		} catch {
			return [];
		}
	}
	const names = projectsFromArgv(argv);
	if (names.length) env[PROJECTS_ENV] = JSON.stringify(names);
	else delete env[PROJECTS_ENV];
	return names;
}

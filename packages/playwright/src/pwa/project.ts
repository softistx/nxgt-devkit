import {
	devices,
	type PlaywrightTestConfig,
	type Project,
} from '@playwright/test';
import type { AppConfigOptions } from '../config/define-app-config';
import { selectedProjects } from '../config/selected-projects';

type WebServer = Exclude<
	NonNullable<PlaywrightTestConfig['webServer']>,
	readonly unknown[]
>;

export type PwaProjectOptions = {
	/** The production server's port, a port of its own. `PW_PORT` wins. */
	port: number;
	/** The project's name. Default `'pwa'`. */
	name?: string;
	/** Where its specs are. Default `./playwright/pwa`. */
	testDir?: string;
	/** Builds the app; `false` serves a build already made. Default `bun run build`. */
	build?: string | false;
	/** Serves the build on `PORT`. Default `bun run start`. */
	start?: string;
	/**
	 * The path the server is awaited on: one that answers 2xx or 3xx without
	 * a backend (a static file such as `/manifest.webmanifest`). Default `/`.
	 */
	readyPath?: string;
	/** Extra environment for the server. No mock flag: a production build ignores them. */
	env?: Record<string, string>;
	/**
	 * Merged over the web server the preset builds (`stderr`, `timeout`, …);
	 * its `env` is merged too, `PORT` always the preset's.
	 */
	webServer?: Partial<WebServer>;
	/** Merged over the project's `use` (Desktop Chrome, workers allowed). */
	use?: Project['use'];
	/** Merged last by `defineAppConfig`; its `projects` come after this one. */
	overrides?: PlaywrightTestConfig;
};

/**
 * The options of a run that is the PWA project alone: a production build,
 * served on a port of its own with no mocks, and one project in Chromium
 * with service workers allowed — no browsers, phones or setup project
 * besides. Give it to `defineAppConfig` on a PWA run:
 *
 * ```ts
 * export default defineAppConfig(
 *   isPwaRun() ? pwaProject({ port: 5274 }) : { port: 5273, setup: true },
 * );
 * ```
 *
 * Chromium, because it is where Playwright can ask installability (CDP) and
 * where `context.setOffline` reaches a worker's own fetches.
 */
export function pwaProject(
	options: PwaProjectOptions,
	env: NodeJS.ProcessEnv = process.env,
): AppConfigOptions {
	const port = Number(env.PW_PORT) || options.port;
	const {
		name = 'pwa',
		testDir = './playwright/pwa',
		build = 'bun run build',
		start = 'bun run start',
		readyPath = '/',
		overrides = {},
	} = options;
	const project: Project = {
		name,
		testDir,
		use: {
			...devices['Desktop Chrome'],
			serviceWorkers: 'allow',
			...options.use,
		},
	};
	return {
		port,
		browsers: [],
		mobile: false,
		setup: false,
		testDir,
		webServer: {
			command: build ? `${build} && ${start}` : start,
			url: `http://localhost:${port}${readyPath.startsWith('/') ? '' : '/'}${readyPath}`,
			reuseExistingServer: !env.CI,
			// A build takes a while.
			timeout: 180_000,
			...options.webServer,
			env: { ...options.env, ...options.webServer?.env, PORT: String(port) },
		},
		overrides: {
			...overrides,
			projects: [project, ...(overrides.projects ?? [])],
		},
	};
}

/**
 * Whether this run is the PWA one: `--project <project>` on the command line
 * (the same answer in the workers, through `selectedProjects`), or `<env>=1`
 * for UI mode and editor extensions, which pick projects without
 * `--project`. Defaults: `pwa`, `PWA`.
 */
export function isPwaRun(
	{
		project = 'pwa',
		env: variable = 'PWA',
	}: { project?: string; env?: string } = {},
	argv: readonly string[] = process.argv,
	env: NodeJS.ProcessEnv = process.env,
): boolean {
	return env[variable] === '1' || selectedProjects(argv, env).includes(project);
}

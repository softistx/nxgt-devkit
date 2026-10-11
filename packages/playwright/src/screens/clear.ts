import { rmSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import type { FullConfig } from '@playwright/test';
import { screensDir } from './dir';

/** Whether `dir` is `inside` or one of the folders holding it. */
function holds(dir: string, inside: string): boolean {
	const path = relative(dir, inside);
	return path === '' || !path.startsWith('..');
}

/**
 * The global setup `defineAppConfig({ screens })` registers on a run that
 * saves screens: it empties the screens folder, so it holds this run's
 * screens only — none of a screen since renamed or removed. It refuses a
 * folder that is, or holds, the config's own folder or the tests'.
 */
export default function clearScreens(config: FullConfig): void {
	const dir = screensDir(config);
	const guarded = [
		config.configFile ? dirname(config.configFile) : process.cwd(),
		config.rootDir,
	].filter(Boolean);
	const hit = guarded.find((folder) => holds(dir, folder));
	if (hit) {
		throw new Error(
			`defineAppConfig: screens.dir resolves to ${dir}, which holds ${hit}; ` +
				'emptying it would delete the project. Give the screens a folder of their own, such as ./playwright/screenshots.',
		);
	}
	rmSync(dir, { recursive: true, force: true });
}

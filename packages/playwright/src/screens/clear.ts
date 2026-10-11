import { rmSync } from 'node:fs';
import type { FullConfig } from '@playwright/test';
import { screensDir } from './dir';

/**
 * The global setup `defineAppConfig({ screens })` registers on a run that
 * saves screens: it empties the screens folder, so it holds this run's
 * screens only — none of a screen since renamed or removed.
 */
export default function clearScreens(config: FullConfig): void {
	rmSync(screensDir(config), { recursive: true, force: true });
}

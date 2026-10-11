import { dirname, isAbsolute, resolve } from 'node:path';
import type { FullConfig } from '@playwright/test';

/** Where screens go when nothing says otherwise, relative to the config file. */
export const DEFAULT_SCREENS_DIR = './playwright/screenshots';

/**
 * What `defineAppConfig`'s `screens` option leaves in the config's
 * `metadata`, for the workers (`saveScreen`) and the global setup that
 * empties the folder to read.
 */
export type ScreensMetadata = {
	/** As given; relative to the config file's folder. */
	dir: string;
	/** Whether this run saves screens: the option's variable was `1`. */
	enabled: boolean;
};

export const SCREENS_METADATA_KEY = 'nxgtScreens';

/** The `screens` entry of a config's metadata, when `defineAppConfig` set one. */
export function screensMetadata(
	config: Pick<FullConfig, 'metadata'>,
): ScreensMetadata | undefined {
	const value = config.metadata?.[SCREENS_METADATA_KEY] as
		| Partial<ScreensMetadata>
		| undefined;
	if (!value || typeof value.dir !== 'string') return undefined;
	return { dir: value.dir, enabled: value.enabled === true };
}

/**
 * The screens folder as an absolute path: `dir` (default the config's, else
 * {@link DEFAULT_SCREENS_DIR}) resolved against the config file's folder, as
 * Playwright resolves its own paths.
 */
export function screensDir(
	config: Pick<FullConfig, 'metadata' | 'configFile' | 'rootDir'>,
	dir?: string,
): string {
	const chosen = dir ?? screensMetadata(config)?.dir ?? DEFAULT_SCREENS_DIR;
	if (isAbsolute(chosen)) return chosen;
	const base = config.configFile ? dirname(config.configFile) : process.cwd();
	return resolve(base, chosen);
}

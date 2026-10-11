import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { PlaywrightTestConfig } from '@playwright/test';
import {
	DEFAULT_SCREENS_DIR,
	SCREENS_METADATA_KEY,
	type ScreensMetadata,
} from '../screens/dir';

/** `defineAppConfig`'s `screens` option. */
export type ScreensOption = boolean | { dir?: string; env?: string };

/**
 * The global setup that empties the screens folder: `dist/screens/clear.js`
 * from the build (an entry point of its own, one folder below `dist` like
 * this module and the chunks it may be bundled into), `src/screens/clear.ts`
 * from the sources.
 */
export function clearScreensSetup(): string {
	const extension = import.meta.url.endsWith('.ts') ? 'ts' : 'js';
	const path = fileURLToPath(
		new URL(`../screens/clear.${extension}`, import.meta.url),
	);
	if (!existsSync(path)) {
		throw new Error(
			`defineAppConfig: the screens' global setup is missing at ${path}. ` +
				'Reinstall @nxgt/playwright.',
		);
	}
	return path;
}

/** The `screens` option, as the config's metadata and global setup. */
export function screensConfig(
	screens: ScreensOption | undefined,
	env: NodeJS.ProcessEnv = process.env,
): Pick<PlaywrightTestConfig, 'metadata' | 'globalSetup'> {
	if (!screens) return {};
	const { dir = DEFAULT_SCREENS_DIR, env: variable = 'SCREENS' } =
		screens === true ? {} : screens;
	const metadata: ScreensMetadata = { dir, enabled: env[variable] === '1' };
	return {
		metadata: { [SCREENS_METADATA_KEY]: metadata },
		...(metadata.enabled ? { globalSetup: clearScreensSetup() } : {}),
	};
}

/**
 * The screens' part of the config, and the overrides with their `metadata`
 * merged into it: `defineConfig` replaces `metadata` wholesale, and an app's
 * own keys must not drop the entry the workers read.
 */
export function withScreens(
	option: ScreensOption | undefined,
	overrides: PlaywrightTestConfig = {},
): {
	screens: Pick<PlaywrightTestConfig, 'metadata' | 'globalSetup'>;
	overrides: PlaywrightTestConfig;
} {
	const screens = screensConfig(option);
	if (!screens.metadata || !overrides.metadata) return { screens, overrides };
	return {
		screens,
		overrides: {
			...overrides,
			metadata: { ...screens.metadata, ...overrides.metadata },
		},
	};
}

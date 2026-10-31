import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { PlaywrightTestConfig } from '@playwright/test';
import { WARM_UP_METADATA_KEY, type WarmUpOptions } from '../warm-up/warm-up';

/** `defineAppConfig`'s `warmUp` option. */
export type WarmUpOption = boolean | WarmUpOptions;

/**
 * The warm-up's global setup: `dist/warm-up/setup.js` from the build (an
 * entry point of its own), `src/warm-up/setup.ts` from the sources.
 */
export function warmUpSetup(): string {
	const extension = import.meta.url.endsWith('.ts') ? 'ts' : 'js';
	const path = fileURLToPath(
		new URL(`../warm-up/setup.${extension}`, import.meta.url),
	);
	if (!existsSync(path)) {
		throw new Error(
			`defineAppConfig: the warm-up's global setup is missing at ${path}. ` +
				'Reinstall @nxgt/playwright.',
		);
	}
	return path;
}

/** The `warmUp` option, as the config's metadata and global setup. */
export function warmUpConfig(
	warmUp: WarmUpOption | undefined,
): Pick<PlaywrightTestConfig, 'metadata' | 'globalSetup'> {
	if (!warmUp) return {};
	return {
		metadata: { [WARM_UP_METADATA_KEY]: warmUp === true ? {} : warmUp },
		globalSetup: warmUpSetup(),
	};
}

/** Global setups chained in order: one stays a string, several an array. */
export function chainSetups(
	...setups: (string | string[] | undefined)[]
): string | string[] | undefined {
	const list = setups.flatMap((setup) => setup ?? []);
	return list.length > 1 ? list : list[0];
}

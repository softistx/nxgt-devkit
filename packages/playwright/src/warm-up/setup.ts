import type { FullConfig } from '@playwright/test';
import {
	configBaseURL,
	WARM_UP_METADATA_KEY,
	type WarmUpOptions,
	warmUp,
} from './warm-up';

/**
 * The global setup `defineAppConfig({ warmUp })` registers: it reads the
 * option from the config's metadata and warms the base URL up.
 */
export default async function warmUpSetup(config: FullConfig): Promise<void> {
	const options = config.metadata?.[WARM_UP_METADATA_KEY] as
		| WarmUpOptions
		| undefined;
	const baseURL = configBaseURL(config);
	if (!options || !baseURL) return;
	await warmUp(baseURL, options);
}

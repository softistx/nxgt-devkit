import { defineNetworkFixture, type NetworkFixture } from '@msw/playwright';
import { test as base } from '@playwright/test';
import type { AnyHandler } from 'msw';

export type MswFixtures = {
	/** The handlers for this test. Override per file: `test.use({ handlers })`. */
	handlers: AnyHandler[];
	/** The running network fixture: `network.use(...)` to add handlers mid-test. */
	network: NetworkFixture;
};

export type MswTestOptions = {
	/**
	 * Runs before the network is enabled, in the worker, for each test — to
	 * reseed mock data that lives in the worker and would otherwise carry one
	 * test's writes into the next.
	 */
	onReset?: () => unknown;
};

/**
 * A `test` whose every page goes through msw, with `handlers` as the default:
 *
 * ```ts
 * // playwright/config/playwright.setup.ts
 * export const test = createMswTest(handlers);
 * ```
 */
export function createMswTest(
	handlers: AnyHandler[],
	options: MswTestOptions = {},
) {
	return base.extend<MswFixtures>({
		handlers: [handlers, { option: true }],
		network: [
			async ({ context, handlers }, use) => {
				await options.onReset?.();
				const network = defineNetworkFixture({ context, handlers });
				await network.enable();
				await use(network);
				await network.disable();
			},
			{ auto: true },
		],
	});
}

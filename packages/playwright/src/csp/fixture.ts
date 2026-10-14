import {
	type BrowserContext,
	test as base,
	expect,
	type Fixtures,
	type PlaywrightTestArgs,
	type TestType,
} from '@playwright/test';
import { watchCsp } from './watch';

export type CspGuardFixtures = { cspGuard: undefined };

/**
 * Adds an automatic `cspGuard` fixture to a `test`: it watches the context
 * and, after the test, fails it when a page met a Content-Security-Policy
 * refusal.
 *
 * ```ts
 * const test = withCspGuard(base);
 * ```
 */
export function withCspGuard<T extends PlaywrightTestArgs, W extends object>(
	test: TestType<T, W>,
) {
	const fixtures = {
		cspGuard: [
			async (
				{ context }: { context: BrowserContext },
				use: (value: undefined) => Promise<void>,
			) => {
				const violations = await watchCsp(context);
				await use(undefined);
				expect(violations, 'Content-Security-Policy refusals').toEqual([]);
			},
			{ auto: true },
		],
	};
	return test.extend<CspGuardFixtures>(
		fixtures as unknown as Fixtures<CspGuardFixtures, object, T, W>,
	);
}

/** Playwright's `test` with `withCspGuard` applied. */
export const cspTest = withCspGuard(base);

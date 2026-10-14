import {
	type BrowserContext,
	test as base,
	expect,
	type Fixtures,
	type PlaywrightTestArgs,
	type TestType,
} from '@playwright/test';
import { watchCsp } from './watch';

export type CspGuardFixtures = {
	/** The refusals this test's pages met so far; poll it to wait for one. */
	cspViolations: string[];
	/** `test.use({ cspGuard: false })` for a spec that expects a refusal. */
	cspGuard: boolean;
};

/**
 * Adds `cspViolations` and an automatic `cspGuard` to a `test`: the context is
 * watched, and after the test it fails when a page met a Content-Security-Policy
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
		cspGuard: [true, { option: true }],
		cspViolations: [
			async (
				{ context, cspGuard }: { context: BrowserContext; cspGuard: boolean },
				use: (value: string[]) => Promise<void>,
			) => {
				const violations = await watchCsp(context);
				await use(violations);
				if (cspGuard) {
					expect(violations, 'Content-Security-Policy refusals').toEqual([]);
				}
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

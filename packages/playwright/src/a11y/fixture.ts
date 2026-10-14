import type {
	Fixtures,
	Page,
	PlaywrightTestArgs,
	TestInfo,
	TestType,
} from '@playwright/test';
import {
	expectFieldsAboveActions,
	expectFocusAboveActions,
	type FocusFieldsOptions,
	type FocusOptions,
} from './obscured';
import type { A11yOptions } from './options';
import {
	type AccessibilityResults,
	accessibilityScan,
	expectAccessible,
} from './scan';

export type A11yFixtures = {
	/** `expectAccessible` and `accessibilityScan`, bound to this test's page. */
	a11y: {
		expect(options?: A11yOptions): Promise<AccessibilityResults>;
		scan(options?: A11yOptions): Promise<AccessibilityResults>;
		/** `expectFocusAboveActions`, bound to this test's page. */
		focusAboveActions(options?: FocusOptions): Promise<void>;
		/** `expectFieldsAboveActions`, bound to this test's page. */
		fieldsAboveActions(options?: FocusFieldsOptions): Promise<void>;
	};
};

/**
 * Adds an `a11y` fixture to a `test`:
 *
 * ```ts
 * const test = withA11y(base);
 * test('home', async ({ page, a11y }) => {
 *   await page.goto('/');
 *   await a11y.expect();
 * });
 * ```
 */
export function withA11y<T extends PlaywrightTestArgs, W extends object>(
	test: TestType<T, W>,
) {
	// Cast once, as `withLoginFixture` does: `Fixtures<…>` cannot be resolved
	// while `T` is still generic.
	const fixtures = {
		a11y: async (
			{ page }: { page: Page },
			use: (a11y: A11yFixtures['a11y']) => Promise<void>,
			testInfo: TestInfo,
		) => {
			await use({
				expect: (options) => expectAccessible(page, { ...options, testInfo }),
				scan: (options) => accessibilityScan(page, options),
				focusAboveActions: (options) => expectFocusAboveActions(page, options),
				fieldsAboveActions: (options) =>
					expectFieldsAboveActions(page, options),
			});
		},
	};
	return test.extend<A11yFixtures>(
		fixtures as unknown as Fixtures<A11yFixtures, object, T, W>,
	);
}

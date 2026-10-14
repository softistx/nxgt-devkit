import type { AxeBuilder } from '@axe-core/playwright';
import { type Page, type TestInfo, test } from '@playwright/test';
import { formatViolations } from './format';
import {
	type A11yOptions,
	assertDisabledRules,
	DEFAULT_TAGS,
	DEFAULT_UNSTICK,
} from './options';
import { withOverlaysInFlow } from './unstick';

/** What axe returns: `violations`, `passes`, `incomplete`, `inapplicable`, … */
export type AccessibilityResults = Awaited<ReturnType<AxeBuilder['analyze']>>;

export type ExpectAccessibleOptions = A11yOptions & {
	/**
	 * Where the JSON report is attached on failure. Default: the running
	 * test's, when there is one.
	 */
	testInfo?: TestInfo;
};

export const MISSING_AXE =
	'@nxgt/playwright/a11y needs @axe-core/playwright, an optional peer that is ' +
	'not installed. Install it: bun add -d @axe-core/playwright';

type AxeModule = { AxeBuilder: typeof AxeBuilder };

/**
 * Loads `@axe-core/playwright` on first use, so that a missing peer is
 * reported by name, with the command that installs it.
 */
export async function loadAxe(
	importer: () => Promise<AxeModule> = () => import('@axe-core/playwright'),
): Promise<AxeModule> {
	try {
		return await importer();
	} catch (error) {
		// The package itself, not something it imports: "Cannot find package
		// 'axe-core' imported from …/@axe-core/playwright/…" is another fault.
		if (
			/Cannot find (package|module) '@axe-core\/playwright'/.test(
				String((error as Error)?.message),
			)
		) {
			throw new Error(MISSING_AXE, { cause: error });
		}
		throw error;
	}
}

const list = (value: string | readonly string[] | undefined) =>
	value === undefined ? [] : typeof value === 'string' ? [value] : value;

/**
 * Runs axe on the page as it is now and returns its results, without
 * asserting anything. The options are `expectAccessible`'s.
 */
export async function accessibilityScan(
	page: Page,
	options: A11yOptions = {},
): Promise<AccessibilityResults> {
	assertDisabledRules(options.disableRules);
	const { AxeBuilder } = await loadAxe();
	let builder = new AxeBuilder({ page }).withTags([
		...(options.tags ?? DEFAULT_TAGS),
	]);
	for (const selector of list(options.include))
		builder = builder.include(selector);
	for (const selector of list(options.exclude))
		builder = builder.exclude(selector);
	const disabled = (options.disableRules ?? []).map(({ rule }) => rule);
	if (disabled.length > 0) builder = builder.disableRules(disabled);
	return withOverlaysInFlow(
		page,
		options.unstick === undefined ? DEFAULT_UNSTICK : list(options.unstick),
		() => builder.analyze(),
	);
}

function currentTestInfo(): TestInfo | undefined {
	try {
		return test.info();
	} catch {
		return undefined;
	}
}

/**
 * Fails when axe finds a WCAG 2.2 A/AA violation on the page: the message
 * lists each rule with its impact, help and first nodes, and the full report
 * is attached to the test as `accessibility-scan.json`.
 *
 * ```ts
 * await expectAccessible(page, {
 *   exclude: '#third-party-widget',
 *   disableRules: [{ rule: 'color-contrast', reason: 'brand palette, tracked in #123' }],
 * });
 * ```
 */
export async function expectAccessible(
	page: Page,
	{ testInfo, ...options }: ExpectAccessibleOptions = {},
): Promise<AccessibilityResults> {
	const results = await accessibilityScan(page, options);
	if (results.violations.length === 0) return results;
	await (testInfo ?? currentTestInfo())?.attach('accessibility-scan.json', {
		body: JSON.stringify(results, null, 2),
		contentType: 'application/json',
	});
	throw new Error(
		formatViolations(results.violations, {
			url: results.url,
			tags: options.tags ?? DEFAULT_TAGS,
		}),
	);
}

/** WCAG 2.0, 2.1 and 2.2 at levels A and AA: what `expectAccessible` checks by default. */
export const DEFAULT_TAGS: readonly string[] = [
	'wcag2a',
	'wcag2aa',
	'wcag21a',
	'wcag21aa',
	'wcag22aa',
];

/**
 * The overlays `unstick` puts back in the flow by default: a form's actions,
 * which `@nxgt/material` keeps `position: sticky` at the bottom of the scroll.
 */
export const DEFAULT_UNSTICK: readonly string[] = [
	'[data-slot="form-actions"]',
];

/** A rule turned off, and why: the reason is what a reviewer reads. */
export type DisabledRule = {
	/** The axe rule id, such as `color-contrast` or `region`. */
	rule: string;
	/** Why it is off here. Required, and not blank. */
	reason: string;
};

export type A11yOptions = {
	/** CSS selectors to scan; the whole page when left out. */
	include?: string | readonly string[];
	/** CSS selectors to leave out of the scan. */
	exclude?: string | readonly string[];
	/** Rules to turn off, each with its reason. */
	disableRules?: readonly DisabledRule[];
	/** The axe tags to run instead of the default WCAG 2.2 A/AA set. */
	tags?: readonly string[];
	/**
	 * CSS selectors of sticky or fixed overlays to put back in the flow
	 * (`position: static`) while axe runs, then restore. Default:
	 * `DEFAULT_UNSTICK`; `[]` turns it off.
	 *
	 * Why: `target-size` (WCAG 2.5.8) measures a control's size, but a bar stuck
	 * over half of it makes axe measure what is left, a result that depends on
	 * where the page stops scrolling. A control hidden under a sticky bar is
	 * Focus Not Obscured (2.4.11), which axe does not check: the app checks that
	 * on its own. Every rule still reads the overlays themselves.
	 */
	unstick?: string | readonly string[];
};

/**
 * Throws when a disabled rule has no reason — the types already ask for one,
 * this catches a plain JavaScript caller or an empty string.
 */
export function assertDisabledRules(
	disableRules: readonly DisabledRule[] = [],
): void {
	for (const entry of disableRules as readonly unknown[]) {
		const { rule, reason } = (entry ?? {}) as Partial<DisabledRule>;
		if (typeof rule !== 'string' || rule.trim() === '') {
			throw new Error(
				`disableRules: ${JSON.stringify(entry)} names no rule. ` +
					"Give each one as { rule: 'color-contrast', reason: '…' }.",
			);
		}
		if (typeof reason !== 'string' || reason.trim() === '') {
			throw new Error(
				`disableRules: "${rule}" is disabled without a reason. ` +
					`Give it as { rule: '${rule}', reason: 'why it is off here' }.`,
			);
		}
	}
}

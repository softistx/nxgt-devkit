import type { Locator, Page } from '@playwright/test';
import { DEFAULT_UNSTICK } from './options';

/** The default `field` selector: `@nxgt/material`'s field wrappers. */
const DEFAULT_FIELD = '[data-slot$="-field"]';

export type FocusOptions = {
	/**
	 * CSS selector of the sticky bar the focused control must end above.
	 * Default: the first of `DEFAULT_UNSTICK`, a form's actions.
	 */
	actions?: string;
	/**
	 * CSS selector of the wrapper around a control whose bottom counts too
	 * (a field's error line sits under its input). Default:
	 * `[data-slot$="-field"]`, `@nxgt/material`'s fields.
	 */
	field?: string;
};

export type FocusFieldsOptions = FocusOptions & {
	/** The control the tabbing stops at. Default: the first `[type="submit"]` in the bar. */
	until?: Locator;
	/** The most Tab presses before giving up. Default 40. */
	limit?: number;
};

type Measure =
	| { kind: 'no-bar' }
	| { kind: 'clear' }
	| { kind: 'overlap'; overlap: number; focused: string };

/** Runs in the page. */
function measure(args: { actions: string; field: string }): Measure {
	const bar = document.querySelector(args.actions);
	if (!bar) return { kind: 'no-bar' };
	const focused = document.activeElement;
	if (!focused || focused === document.body || bar.contains(focused)) {
		return { kind: 'clear' };
	}
	const field = focused.closest(args.field) ?? focused;
	const overlap =
		Math.max(
			focused.getBoundingClientRect().bottom,
			field.getBoundingClientRect().bottom,
		) - bar.getBoundingClientRect().top;
	if (overlap <= 0) return { kind: 'clear' };
	const attr = (name: string) => focused.getAttribute(name);
	const id = attr('id');
	const name = attr('name');
	const label = attr('aria-label');
	const testId = attr('data-pw') ?? attr('data-testid');
	const who = [
		focused.tagName.toLowerCase(),
		id && `#${id}`,
		name && `name="${name}"`,
		label && `aria-label="${label}"`,
		testId && `test id "${testId}"`,
	]
		.filter(Boolean)
		.join(' ');
	const html = focused.outerHTML.replace(/\s+/g, ' ');
	const short = html.length > 120 ? `${html.slice(0, 119)}…` : html;
	return { kind: 'overlap', overlap, focused: `${who} ${short}` };
}

/**
 * The focused control, and its field's error beneath it, end above the sticky
 * actions bar (WCAG 2.4.11 Focus Not Obscured, which axe does not check). A
 * control inside the bar counts as clear. Throws when no element matches
 * `actions`: a check with no bar to measure is broken, never a pass.
 */
export async function expectFocusAboveActions(
	page: Page,
	options: FocusOptions = {},
): Promise<void> {
	const actions = options.actions ?? DEFAULT_UNSTICK[0] ?? '';
	const field = options.field ?? DEFAULT_FIELD;
	const result = await page.evaluate(measure, { actions, field });
	if (result.kind === 'no-bar') {
		throw new Error(
			`no element matches ${actions}: the check cannot run. ` +
				'Pass the selector of your sticky bar as `actions`.',
		);
	}
	if (result.kind === 'overlap') {
		throw new Error(
			`the focused control ends ${Math.round(result.overlap)}px under the sticky bar ${actions} (WCAG 2.4.11 Focus Not Obscured): ${result.focused}. ` +
				'Give the scroll container a scroll-padding-bottom the height of the bar.',
		);
	}
}

/**
 * From the focused field, tabs through the form up to its submit, each control
 * clear of the sticky bar. Throws when `until` is not reached in `limit` tabs.
 */
export async function expectFieldsAboveActions(
	page: Page,
	options: FocusFieldsOptions = {},
): Promise<void> {
	const actions = options.actions ?? DEFAULT_UNSTICK[0] ?? '';
	const limit = options.limit ?? 40;
	const until =
		options.until ?? page.locator(actions).locator('[type="submit"]').first();
	const focusOptions = { actions, field: options.field };
	const reached = () =>
		until.evaluate((el) => el === document.activeElement, undefined, {
			timeout: 5_000,
		});
	await expectFocusAboveActions(page, focusOptions);
	for (let i = 0; i < limit; i++) {
		await page.keyboard.press('Tab');
		if (await reached()) return;
		await expectFocusAboveActions(page, focusOptions);
	}
	throw new Error(
		`the submit was not reached in ${limit} tabs (${until}). ` +
			'Raise `limit`, or pass the control to stop at as `until`.',
	);
}

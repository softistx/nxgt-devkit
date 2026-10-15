import type { Locator, Page } from '@playwright/test';
import { nextFrames } from '../helpers/frames';
import { DEFAULT_UNSTICK } from './options';

/** The default `field` selector: `@nxgt/material`'s field wrappers. */
const DEFAULT_FIELD = '[data-slot$="-field"]';

export type FocusOptions = {
	/**
	 * CSS selector, or a list of them (joined with `, `), of the sticky bar the
	 * focused control must end above: the list an app passes to `unstick` works
	 * here. Default: `DEFAULT_UNSTICK`, a form's actions.
	 */
	actions?: string | readonly string[];
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
	| { kind: 'no-focus' }
	| { kind: 'clear' }
	| { kind: 'overlap'; overlap: number; focused: string };

/** Runs in the page. */
function measure(args: { actions: string; field: string }): Measure {
	const focused = document.activeElement;
	const all = [...document.querySelectorAll(args.actions)];
	if (all.length === 0) return { kind: 'no-bar' };
	if (!focused || focused === document.body) return { kind: 'no-focus' };
	// A bar that does not render (display: none, no height) covers nothing.
	const bars = all.filter((bar) => {
		const rect = bar.getBoundingClientRect();
		return rect.height > 0 && rect.width > 0;
	});
	if (bars.some((bar) => bar.contains(focused))) return { kind: 'clear' };
	const control = focused.getBoundingClientRect();
	const field = (
		focused.closest(args.field) ?? focused
	).getBoundingClientRect();
	const bottom = Math.max(control.bottom, field.bottom);
	const top = Math.min(control.top, field.top);
	// The part of the control (and its field) hidden under a bar: the bar is a
	// rectangle, so a bar above the control, or beside it, hides nothing.
	const overlapOf = (bar: Element) => {
		const rect = bar.getBoundingClientRect();
		const across =
			Math.min(control.right, rect.right) - Math.max(control.left, rect.left);
		if (across <= 0 || control.top >= rect.bottom) return 0;
		return Math.min(bottom, rect.bottom) - Math.max(rect.top, top);
	};
	const own = bars.find((bar) => bar.closest('form')?.contains(focused));
	const worst = own
		? overlapOf(own)
		: Math.max(0, ...bars.map((bar) => overlapOf(bar)));
	if (worst <= 0) return { kind: 'clear' };
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
	return { kind: 'overlap', overlap: worst, focused: `${who} ${short}` };
}

async function check(
	page: Page,
	actions: string,
	field: string,
): Promise<Measure> {
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
				'Give the scroll container a scroll-padding-bottom the height of the bar, and the control (or its field) a scroll-margin-bottom for the error line beneath it.',
		);
	}
	return result;
}

/** The selector a `FocusOptions.actions` stands for. */
const selectorOf = (actions: string | readonly string[] = DEFAULT_UNSTICK) =>
	typeof actions === 'string' ? actions : actions.join(', ');

/**
 * The focused control, and its field's error beneath it, are not hidden under
 * the sticky bar (WCAG 2.4.11 Focus Not Obscured, which axe does not check).
 * The bar is a rectangle: a bar that does not render, or sits above or beside
 * the control, hides nothing. A control inside the bar counts as clear.
 *
 * With several elements matching `actions`, the ones that do not render are
 * ignored; the control is measured against the bar of its own `<form>`, else
 * the worst overlap. Top document only: a bar in an iframe or a shadow root is
 * not reached. Throws when no element matches `actions` (a check with no bar
 * to measure is broken, never a pass) and when nothing is focused.
 */
export async function expectFocusAboveActions(
	page: Page,
	options: FocusOptions = {},
): Promise<void> {
	const result = await check(
		page,
		selectorOf(options.actions),
		options.field ?? DEFAULT_FIELD,
	);
	if (result.kind === 'no-focus') {
		throw new Error('nothing is focused: focus a control before checking');
	}
}

/**
 * From the focused field, tabs through the form up to `until` (by default the
 * first submit in the bar), each control, `until` included, clear of the
 * sticky bar. When focus starts on the page itself, the first Tab lands on the
 * first control. Throws when `until` is not reached in `limit` tabs. Top
 * document only.
 */
export async function expectFieldsAboveActions(
	page: Page,
	options: FocusFieldsOptions = {},
): Promise<void> {
	const actions = selectorOf(options.actions);
	const field = options.field ?? DEFAULT_FIELD;
	const limit = options.limit ?? 40;
	const until =
		options.until ?? page.locator(actions).locator('[type="submit"]').first();
	const reached = () =>
		until.evaluate((el) => el === document.activeElement, undefined, {
			timeout: 5_000,
		});
	// Focus may start on the page itself: the first Tab is the first control.
	await check(page, actions, field);
	for (let i = 0; i < limit; i++) {
		await page.keyboard.press('Tab');
		// The scroll that brings the control into view is smooth or deferred.
		await nextFrames(page);
		await check(page, actions, field);
		if (await reached()) return;
	}
	throw new Error(
		`the submit was not reached in ${limit} tabs (${until}). ` +
			'Raise `limit`, or pass the control to stop at as `until`.',
	);
}

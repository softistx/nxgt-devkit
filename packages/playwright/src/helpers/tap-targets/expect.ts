import type { Page } from '@playwright/test';
import { formatTapTargets } from './format';
import { judgeTapTargets } from './judge';
import { measure } from './measure';
import { DEFAULT_TAP_TARGETS } from './targets';
import type { TapTargetOptions } from './types';

const list = (v: string | readonly string[] | undefined): string[] =>
	v === undefined ? [] : typeof v === 'string' ? [v] : [...v];

/**
 * Fails when a tap target is smaller than a comfortable touch target,
 * 44x44 CSS pixels by default: the icon button a thumb misses on a phone.
 * Links, buttons, form controls, `summary`, the interactive ARIA roles,
 * anything focusable by `tabindex` and anything with an `onclick` count; a
 * checkbox or radio counts together with its labels, as one bounding box (a
 * `for` label far from the input includes the gap). Not measured: what is
 * hidden, disabled (`disabled`, `aria-disabled`), `inert`, `pointer-events:
 * none`, zero-sized or visually hidden (`sr-only`: a 1px box or `clip`), and
 * an `inline` link inside a sentence (WCAG 2.5.8's inline exception; an
 * `inline-block` link is measured).
 *
 * This is the comfortable-touch size, not WCAG 2.5.8's minimum: that is 24px
 * with a spacing exception, it is axe's `target-size` rule, and
 * `expectAccessible` already runs it. Run this one on a phone viewport.
 *
 * ```ts
 * await page.goto('/projects');
 * await expectTapTargets(page, { exclude: '.legal a' });
 * ```
 */
export async function expectTapTargets(
	page: Page,
	{
		size = 44,
		spacing = false,
		targets = DEFAULT_TAP_TARGETS,
		include,
		exclude,
		max = 5,
	}: TapTargetOptions = {},
): Promise<void> {
	const { viewport, boxes } = await page.evaluate(measure, {
		targets: list(targets),
		include: list(include),
		exclude: list(exclude),
	});
	const found = judgeTapTargets(boxes, { size, spacing });
	if (found.length > 0) {
		throw new Error(formatTapTargets(found, viewport, { size, max }));
	}
}

import type { Page } from '@playwright/test';
import { toList } from '../list';
import { formatTapTargets } from './format';
import { probeHitAreas } from './hit-area';
import { judgeTapTargets, TOLERANCE } from './judge';
import { measure } from './measure';
import { DEFAULT_TAP_TARGETS } from './targets';
import type { TapTargetBox, TapTargetOptions } from './types';

/**
 * Fails when a tap target is smaller than a comfortable touch target,
 * 44x44 CSS pixels by default: the icon button a thumb misses on a phone.
 * Links, buttons, form controls, `summary`, the interactive ARIA roles,
 * anything focusable by `tabindex` and anything with an `onclick` count; a
 * checkbox or radio counts together with its labels, as one bounding box (a
 * `for` label far from the input includes the gap). Not measured: what is
 * hidden, disabled (`disabled`, `aria-disabled`), `inert`, `pointer-events:
 * none`, zero-sized or visually hidden (`sr-only`: a 1px box or `clip`),
 * what an open modal layer hides (`aria-hidden`, while a modal `<dialog>`, a
 * shown `aria-modal` element or a body without pointer events is there), an
 * undersized target a layer covers (below), and an `inline` link inside a sentence (WCAG 2.5.8's inline exception; an
 * `inline-block` link is measured).
 *
 * A target whose box is smaller than `size` still passes when its hit area
 * fills the `size` square centred on its box (with its labels, for a
 * checkbox or radio; `hitArea`, on by default): an
 * invisible `::before` of 44px on a 20px checkbox. The square is probed with
 * `elementFromPoint` on a 5x5 grid, scrolling the target into view when it
 * is off screen or covered where it sits, and restoring every scroll
 * position afterwards. An undersized target that another element still
 * covers once scrolled to the middle, at the centre of each of its boxes
 * and its labels' (a toast, a modal layer, the front toast of a stack), is
 * out of reach in that state and not judged.
 * `hitArea: false` judges the visible box only.
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
		hitArea = true,
		targets = DEFAULT_TAP_TARGETS,
		include,
		exclude,
		max = 5,
	}: TapTargetOptions = {},
): Promise<void> {
	const selectors = toList(targets);
	if (selectors.length === 0) {
		throw new Error(
			'expectTapTargets: `targets` is empty. Name at least one selector, or drop `targets` for DEFAULT_TAP_TARGETS (spread it to add to it).',
		);
	}
	const where = {
		targets: selectors,
		include: toList(include),
		exclude: toList(exclude),
	};
	// Selected once, in the page: the probe gets the very elements that were
	// measured, however the page changes in between.
	const handle = await page.evaluateHandle(measure, {
		size,
		tolerance: TOLERANCE,
		hitArea,
		...where,
	});
	let boxes: TapTargetBox[];
	let viewport: { width: number; height: number };
	try {
		const data = await handle.evaluate((r) => r.data);
		if (data.matched === 0) {
			throw new Error(
				`expectTapTargets: \`include\` matched no element (${toList(include).join(', ')}). Fix the selector, or drop \`include\` to check the whole document.`,
			);
		}
		({ boxes, viewport } = data);
		if (data.undersized.length > 0) {
			// A second pass, because it scrolls: the first one only reads.
			const { enlarged, covered } = await handle.evaluate(probeHitAreas, {
				size,
			});
			for (const i of enlarged) {
				const box = boxes[i];
				if (box) box.hitArea = true;
			}
			// Out of reach in this state: neither judged nor a neighbour.
			const out = new Set(covered);
			boxes = boxes.filter((_, i) => !out.has(i));
		}
	} finally {
		await handle.dispose();
	}
	const found = judgeTapTargets(boxes, { size, spacing });
	if (found.length > 0) {
		throw new Error(formatTapTargets(found, viewport, { size, max }));
	}
}

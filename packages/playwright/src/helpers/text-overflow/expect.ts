import type { Page } from '@playwright/test';
import { toList } from '../list';
import { formatTextOverflow } from './format';
import { measure } from './measure';
import type { TextOverflowOptions } from './types';

/**
 * Fails when a text does not fit the box that holds it, the way a label
 * ends up on a phone: a button whose words run past its edge, a title
 * cut short by `text-overflow: ellipsis` or a line clamp with nothing to
 * read it in full. Text that wraps, a box that scrolls (`overflow: auto`),
 * a text hidden for screen readers only and a decoration clipped by its
 * card are fine; so is a clipped text whose box (or the link around it) has
 * a `title` or an `aria-label`. A one-pixel rounding is tolerated.
 *
 * Limits: a text under a CSS `transform`, `scale` or `rotate` (on itself or
 * an ancestor) is skipped, its rectangles and its box being in different
 * coordinate spaces; shadow DOM and iframes are not entered (call it on the
 * frame's page); it measures the page as it is now, so wait for the content
 * first.
 *
 * ```ts
 * await page.goto('/projects');
 * await expectNoTextOverflow(page, { exclude: '.marquee' });
 * ```
 */
export async function expectNoTextOverflow(
	page: Page,
	{ include, exclude, max = 5 }: TextOverflowOptions = {},
): Promise<void> {
	const { viewport, found, matched } = await page.evaluate(measure, {
		include: toList(include),
		exclude: toList(exclude),
	});
	if (matched === 0) {
		throw new Error(
			`expectNoTextOverflow: \`include\` matched no element (${toList(include).join(', ')}). Fix the selector, or drop \`include\` to check the whole body.`,
		);
	}
	if (found.length > 0) {
		throw new Error(formatTextOverflow(found, viewport, { max }));
	}
}

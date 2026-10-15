import type { Locator, Page } from '@playwright/test';

/** An element that reaches past the right edge of the box that scrolls. */
export type OverflowingElement = {
	/** `tag#id.class`, enough to find it in the inspector. */
	selector: string;
	/** Its right edge, in CSS pixels from the left of the box's content. */
	right: number;
	width: number;
};

export type HorizontalOverflow = {
	scrollWidth: number;
	clientWidth: number;
	/** The widest offenders first; at most `max`. */
	elements: OverflowingElement[];
	/**
	 * The inner scroll container that overflows (`tag#id.class`); absent when
	 * it is the page itself.
	 */
	container?: string;
};

export type NoHorizontalScrollOptions = {
	/** How many offending elements the message lists. Default `5`. */
	max?: number;
	/**
	 * An inner scroll container to check as well as the document: an app
	 * shell as tall as the viewport whose content scrolls inside it (its
	 * `main`, or the box around it). Its sideways overflow never widens the
	 * document, so the document's check alone does not see it. A selector or
	 * a locator; the first element it matches is checked, and none — a page
	 * without the shell, such as an error page — checks the document only.
	 */
	scroller?: string | Locator;
};

/** The failure message of `expectNoHorizontalScroll`. */
export function formatOverflow({
	scrollWidth,
	clientWidth,
	elements,
	container,
}: HorizontalOverflow): string {
	const what = container ? `The scroll container ${container}` : 'The page';
	const lines = [
		`${what} scrolls horizontally: scrollWidth ${scrollWidth}px > clientWidth ${clientWidth}px.`,
	];
	if (elements.length === 0) {
		lines.push(
			'No element reaches past the right edge; look for a negative margin or a transform.',
		);
	} else {
		lines.push('Widest elements past the right edge:');
		for (const { selector, right, width } of elements) {
			lines.push(`  - ${selector}  right ${right}px, width ${width}px`);
		}
	}
	return lines.join('\n');
}

/**
 * Measures the box `root` stands for — the document when it is `<html>`, else
 * `root` itself — in the page. Self-contained: Playwright serialises it, so
 * its `describe` is duplicated with text-overflow/measure.ts and
 * tap-targets/measure.ts: a change is made in all three.
 */
function measure(root: Element, max: number): HorizontalOverflow | null {
	const isDocument = root === document.documentElement;
	const box = isDocument ? (document.scrollingElement ?? root) : root;
	const { scrollWidth, clientWidth } = box;
	if (scrollWidth <= clientWidth + 1) return null;
	const describe = (el: Element) =>
		el.tagName.toLowerCase() +
		(el.id ? `#${el.id}` : '') +
		[...el.classList]
			.slice(0, 3)
			.map((c) => `.${c}`)
			.join('');
	// Where the box's content starts, in viewport coordinates: an element's
	// right edge minus this is its distance from the content's left.
	const origin = isDocument
		? -window.scrollX
		: box.getBoundingClientRect().left + box.clientLeft - box.scrollLeft;
	const top = isDocument ? document.body : box;
	// An element inside a box that clips or scrolls sideways cannot widen this
	// one, so only those whose every ancestor up to it lets them overflow count.
	const clipped = (el: Element) => {
		for (let p = el.parentElement; p && p !== top; p = p.parentElement) {
			if (getComputedStyle(p).overflowX !== 'visible') return true;
		}
		return false;
	};
	const elements: OverflowingElement[] = [];
	for (const el of top.querySelectorAll('*')) {
		const rect = el.getBoundingClientRect();
		const right = rect.right - origin;
		if (right <= clientWidth + 1 || rect.width === 0 || clipped(el)) continue;
		elements.push({
			selector: describe(el),
			right: Math.round(right),
			width: Math.round(rect.width),
		});
	}
	elements.sort((a, b) => b.width - a.width || b.right - a.right);
	return {
		scrollWidth,
		clientWidth,
		elements: elements.slice(0, max),
		...(isDocument ? {} : { container: describe(box) }),
	};
}

/**
 * Fails when the page is wider than its viewport — a phone layout that makes
 * the reader scroll sideways — or, with `scroller`, when that inner scroll
 * container is wider than it shows. A one-pixel rounding is tolerated. The
 * message names the widest elements that reach past the right edge.
 *
 * ```ts
 * await page.goto('/projects');
 * await expectNoHorizontalScroll(page, { scroller: 'main' });
 * ```
 */
export async function expectNoHorizontalScroll(
	page: Page,
	{ max = 5, scroller }: NoHorizontalScrollOptions = {},
): Promise<void> {
	const overflow = await page.locator(':root').evaluate(measure, max);
	if (overflow) throw new Error(formatOverflow(overflow));
	if (scroller === undefined) return;
	const inner = (
		typeof scroller === 'string' ? page.locator(scroller) : scroller
	).first();
	if ((await inner.count()) === 0) return;
	const innerOverflow = await inner.evaluate(measure, max);
	if (innerOverflow) throw new Error(formatOverflow(innerOverflow));
}

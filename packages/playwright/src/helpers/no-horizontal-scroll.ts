import type { Page } from '@playwright/test';

/** An element that reaches past the right edge of the viewport. */
export type OverflowingElement = {
	/** `tag#id.class`, enough to find it in the inspector. */
	selector: string;
	/** Its right edge, in CSS pixels from the left of the document. */
	right: number;
	width: number;
};

export type HorizontalOverflow = {
	scrollWidth: number;
	clientWidth: number;
	/** The widest offenders first; at most `max`. */
	elements: OverflowingElement[];
};

export type NoHorizontalScrollOptions = {
	/** How many offending elements the message lists. Default `5`. */
	max?: number;
};

/** The failure message of `expectNoHorizontalScroll`. */
export function formatOverflow({
	scrollWidth,
	clientWidth,
	elements,
}: HorizontalOverflow): string {
	const lines = [
		`The page scrolls horizontally: scrollWidth ${scrollWidth}px > clientWidth ${clientWidth}px.`,
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
 * Fails when the page is wider than its viewport — a phone layout that makes
 * the reader scroll sideways. A one-pixel rounding is tolerated. The message
 * names the widest elements that reach past the right edge.
 *
 * ```ts
 * await page.goto('/projects');
 * await expectNoHorizontalScroll(page);
 * ```
 */
export async function expectNoHorizontalScroll(
	page: Page,
	{ max = 5 }: NoHorizontalScrollOptions = {},
): Promise<void> {
	const overflow = await page.evaluate((max): HorizontalOverflow | null => {
		const root = document.scrollingElement ?? document.documentElement;
		const { scrollWidth, clientWidth } = root;
		if (scrollWidth <= clientWidth + 1) return null;
		// An element inside a box that clips or scrolls sideways cannot widen
		// the page, so only those whose every ancestor lets them overflow count.
		const clipped = (el: Element) => {
			for (
				let p = el.parentElement;
				p && p !== document.body;
				p = p.parentElement
			) {
				if (getComputedStyle(p).overflowX !== 'visible') return true;
			}
			return false;
		};
		const describe = (el: Element) =>
			el.tagName.toLowerCase() +
			(el.id ? `#${el.id}` : '') +
			[...el.classList]
				.slice(0, 3)
				.map((c) => `.${c}`)
				.join('');
		const elements: OverflowingElement[] = [];
		for (const el of document.body.querySelectorAll('*')) {
			const rect = el.getBoundingClientRect();
			const right = rect.right + window.scrollX;
			if (right <= clientWidth + 1 || rect.width === 0 || clipped(el)) continue;
			elements.push({
				selector: describe(el),
				right: Math.round(right),
				width: Math.round(rect.width),
			});
		}
		elements.sort((a, b) => b.width - a.width || b.right - a.right);
		return { scrollWidth, clientWidth, elements: elements.slice(0, max) };
	}, max);
	if (overflow) throw new Error(formatOverflow(overflow));
}

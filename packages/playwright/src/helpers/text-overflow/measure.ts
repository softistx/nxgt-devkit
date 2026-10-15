import type { OverflowingText } from './types';

export type Measured = {
	viewport: { width: number; height: number };
	found: OverflowingText[];
};

/**
 * Measures every text under `include` in the page. Self-contained:
 * Playwright serialises it, so it imports nothing at run time and every
 * helper lives inside it. Judges nothing about how many; the caller cuts.
 * Three parts: the shared constants, the predicates (`is`), and `visit`,
 * which judges one text node.
 */
export async function measure(args: {
	include: string[];
	exclude: string[];
}): Promise<Measured> {
	// Web fonts change widths.
	await document.fonts.ready;
	const SKIP =
		'script,style,noscript,template,svg,input,textarea,select,option,[contenteditable]:not([contenteditable=false])';
	const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
	const brief = (s: string) => (s.length > 40 ? `${s.slice(0, 40)}…` : s);
	const clipsOn = (v: string) => v === 'hidden' || v === 'clip';
	const describe = (el: Element) =>
		el.tagName.toLowerCase() +
		(el.id ? `#${el.id}` : '') +
		[...el.classList]
			.slice(0, 3)
			.map((c) => `.${c}`)
			.join('');
	const roots = args.include.length
		? args.include.flatMap((s) => [...document.querySelectorAll(s)])
		: [document.body];

	const is = {
		excluded: (el: Element) => args.exclude.some((s) => el.closest(s) !== null),
		// Not shown, or shown only to a screen reader (`sr-only`'s clip).
		hidden: (el: Element) => {
			for (let p: Element | null = el; p; p = p.parentElement) {
				const s = getComputedStyle(p);
				if (s.visibility !== 'visible' || s.opacity === '0') return true;
				if (
					(s.position === 'absolute' || s.position === 'fixed') &&
					(s.clip !== 'auto' || s.clipPath !== 'none')
				) {
					return true;
				}
			}
			return false;
		},
		// Under a transform (scale, rotate) the text's rectangles and the
		// box's `clientWidth` are in different coordinate spaces: not compared.
		transformed: (el: Element) => {
			for (let p: Element | null = el; p; p = p.parentElement) {
				const s = getComputedStyle(p);
				if (
					s.transform !== 'none' ||
					s.scale !== 'none' ||
					s.rotate !== 'none'
				) {
					return true;
				}
			}
			return false;
		},
		// Inline content only: a row of boxes with their own heights, or a card
		// with a decorative child, says nothing about the height of its text.
		inlineOnly: (box: Element) =>
			[...box.children].every((c) => getComputedStyle(c).display === 'inline'),
		// A title or aria-label on the box, or on an ancestor that holds only
		// its text, gives the full text to whoever hovers or listens.
		hasFullText: (box: Element) => {
			const own = collapse(box.textContent ?? '');
			for (let p: Element | null = box; p; p = p.parentElement) {
				if (p !== box && collapse(p.textContent ?? '') !== own) return false;
				if (
					(p.getAttribute('title') ?? '').trim() ||
					(p.getAttribute('aria-label') ?? '').trim()
				) {
					return true;
				}
			}
			return false;
		},
	};
	// The nearest ancestor that is not `inline`.
	const boxOf = (el: Element) => {
		for (let p: Element | null = el; p; p = p.parentElement) {
			const d = getComputedStyle(p).display;
			if (d !== 'inline' && d !== 'contents') return p;
		}
		return null;
	};

	const found: OverflowingText[] = [];
	// One entry per box and axis, whatever the number of text nodes in it.
	const ids = new Map<Element, number>();
	const seen = new Set<string>();
	const once = (box: Element, axis: string) => {
		if (!ids.has(box)) ids.set(box, ids.size);
		const key = `${axis}${ids.get(box)}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	};
	const report = (
		box: Element,
		axis: 'x' | 'y',
		text: string,
		textWidth: number,
		boxWidth: number,
	) => {
		const style = getComputedStyle(box);
		const overflow = axis === 'x' ? style.overflowX : style.overflowY;
		if (overflow !== 'visible' && !clipsOn(overflow)) return;
		const kind = overflow === 'visible' ? 'spills' : 'clipped';
		if (kind === 'clipped' && is.hasFullText(box)) return;
		const ellipsis =
			axis === 'x'
				? style.textOverflow === 'ellipsis'
				: style.getPropertyValue('-webkit-line-clamp') !== 'none';
		found.push({
			selector: describe(box),
			text: brief(text),
			kind,
			ellipsis,
			textWidth: Math.round(textWidth),
			boxWidth: Math.round(boxWidth),
			axis,
		});
	};

	const range = document.createRange();
	// Judges one text node: sideways by its rectangles, vertically by the box.
	const visit = (node: Node) => {
		const text = collapse(node.textContent ?? '');
		const parent = node.parentElement;
		if (!text || !parent || parent.closest(SKIP) || is.excluded(parent)) return;
		const box = boxOf(parent);
		if (!box || box.closest(SKIP) || is.hidden(parent)) return;
		if (is.transformed(parent)) return;
		if (box.clientWidth <= 1 || box.clientHeight <= 1) return;
		range.selectNodeContents(node);
		const rects = [...range.getClientRects()].filter((r) => r.width > 0);
		if (rects.length === 0) return;
		const left = box.getBoundingClientRect().left + box.clientLeft;
		const right = left + box.clientWidth;
		const textLeft = Math.min(...rects.map((r) => r.left));
		const textRight = Math.max(...rects.map((r) => r.right));
		if ((textRight > right + 1 || textLeft < left - 1) && once(box, 'x')) {
			report(box, 'x', text, textRight - textLeft, box.clientWidth);
		}
		if (
			box.scrollHeight > box.clientHeight + 1 &&
			is.inlineOnly(box) &&
			once(box, 'y')
		) {
			report(
				box,
				'y',
				collapse(box.textContent ?? ''),
				box.scrollHeight,
				box.clientHeight,
			);
		}
	};

	for (const root of roots) {
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		for (let n = walker.nextNode(); n; n = walker.nextNode()) visit(n);
	}
	return {
		viewport: { width: window.innerWidth, height: window.innerHeight },
		found,
	};
}

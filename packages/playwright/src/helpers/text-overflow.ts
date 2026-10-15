import type { Page } from '@playwright/test';

/** A text that does not fit the box that holds it. */
export type OverflowingText = {
	/** The box (`tag#id.class`), enough to find it in the inspector. */
	selector: string;
	/** The text, its first 40 characters, ellipsised when longer. */
	text: string;
	/**
	 * `clipped`: the box hides what does not fit (`overflow: hidden` or
	 * `clip`, which `text-overflow: ellipsis` and a line clamp need) and gives
	 * the full text nowhere (no `title`, no `aria-label`). `spills`: the box
	 * leaves it visible, so it runs over its surroundings.
	 */
	kind: 'clipped' | 'spills';
	/** The box ends the clipped text with an ellipsis (`text-overflow`, a line clamp). */
	ellipsis: boolean;
	/** The text's extent along `axis`, in CSS pixels. */
	textWidth: number;
	/** The box's extent along `axis`, in CSS pixels. */
	boxWidth: number;
	/** `x`: too wide for the box. `y`: too many lines for its height. */
	axis: 'x' | 'y';
};

export type TextOverflowOptions = {
	/**
	 * Where to look: a selector or a list of them. Default the whole `body`.
	 */
	include?: string | readonly string[];
	/** Boxes to leave out, with everything inside them. */
	exclude?: string | readonly string[];
	/** How many offending boxes the message lists. Default `5`. */
	max?: number;
};

/** The failure message of `expectNoTextOverflow`. */
export function formatTextOverflow(
	found: readonly OverflowingText[],
	viewport: { width: number; height: number },
	max = 5,
): string {
	const n = found.length;
	const lines = [
		`Text overflows its box in ${n} element${n === 1 ? '' : 's'} (${viewport.width}x${viewport.height} viewport):`,
	];
	for (const f of found.slice(0, max)) {
		const what =
			f.kind === 'spills'
				? 'spills:'
				: `clipped${f.ellipsis ? ' with an ellipsis' : ''}, no title:`;
		const box = f.axis === 'y' ? `${f.boxWidth}px-tall` : `${f.boxWidth}px`;
		lines.push(
			`  - ${f.selector}  ${what} "${f.text}"  ${f.textWidth}px of text in a ${box} box`,
		);
	}
	if (n > max) lines.push(`  … and ${n - max} more`);
	lines.push(
		'Let the text wrap, give a clipped one its full text in a title or aria-label, or exclude it.',
	);
	return lines.join('\n');
}

type Measured = {
	viewport: { width: number; height: number };
	found: OverflowingText[];
};

/**
 * Measures every text under `include` in the page. Self-contained:
 * Playwright serialises it. Judges nothing about how many; the caller cuts.
 */
async function measure(args: {
	include: string[];
	exclude: string[];
}): Promise<Measured> {
	// Web fonts change widths.
	await document.fonts.ready;
	const SKIP =
		'script,style,noscript,template,svg,input,textarea,select,option,[contenteditable]:not([contenteditable=false])';
	const describe = (el: Element) =>
		el.tagName.toLowerCase() +
		(el.id ? `#${el.id}` : '') +
		[...el.classList]
			.slice(0, 3)
			.map((c) => `.${c}`)
			.join('');
	const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
	const roots = args.include.length
		? args.include.flatMap((s) => [...document.querySelectorAll(s)])
		: [document.body];
	const excluded = (el: Element) =>
		args.exclude.some((s) => el.closest(s) !== null);
	// Not shown, or shown only to a screen reader (`sr-only`'s clip).
	const hidden = (el: Element) => {
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
	};
	const boxOf = (el: Element) => {
		for (let p: Element | null = el; p; p = p.parentElement) {
			const d = getComputedStyle(p).display;
			if (d !== 'inline' && d !== 'contents') return p;
		}
		return null;
	};
	// Inline content only: a row of boxes with their own heights, or a card
	// with a decorative child, says nothing about the height of its text.
	const inlineOnly = (box: Element) =>
		[...box.children].every((c) => getComputedStyle(c).display === 'inline');
	const brief = (s: string) => (s.length > 40 ? `${s.slice(0, 40)}…` : s);
	const clipsOn = (v: string) => v === 'hidden' || v === 'clip';
	// A title or aria-label on the box, or on an ancestor that holds only its
	// text, gives the full text to whoever hovers or listens.
	const hasFullText = (box: Element) => {
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
	const range = document.createRange();
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
		if (kind === 'clipped' && hasFullText(box)) return;
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
	for (const root of roots) {
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const text = collapse(node.textContent ?? '');
			const parent = node.parentElement;
			if (!text || !parent || parent.closest(SKIP) || excluded(parent))
				continue;
			const box = boxOf(parent);
			if (!box || box.closest(SKIP) || hidden(parent)) continue;
			const boxRect = box.getBoundingClientRect();
			if (box.clientWidth <= 1 || box.clientHeight <= 1) continue;
			range.selectNodeContents(node);
			const rects = [...range.getClientRects()].filter((r) => r.width > 0);
			if (rects.length === 0) continue;
			const left = boxRect.left + box.clientLeft;
			const right = left + box.clientWidth;
			const textLeft = Math.min(...rects.map((r) => r.left));
			const textRight = Math.max(...rects.map((r) => r.right));
			if (textRight > right + 1 || textLeft < left - 1) {
				if (once(box, 'x')) {
					report(box, 'x', text, textRight - textLeft, box.clientWidth);
				}
			}
			if (box.scrollHeight > box.clientHeight + 1 && inlineOnly(box)) {
				if (once(box, 'y')) {
					report(
						box,
						'y',
						collapse(box.textContent ?? ''),
						box.scrollHeight,
						box.clientHeight,
					);
				}
			}
		}
	}
	return {
		viewport: { width: window.innerWidth, height: window.innerHeight },
		found,
	};
}

const list = (v: string | readonly string[] | undefined): string[] =>
	v === undefined ? [] : typeof v === 'string' ? [v] : [...v];

/**
 * Fails when a text does not fit the box that holds it, the way a label
 * ends up on a phone: a button whose words run past its edge, a title
 * cut short by `text-overflow: ellipsis` or a line clamp with nothing to
 * read it in full. Text that wraps, a box that scrolls (`overflow: auto`),
 * a text hidden for screen readers only and a decoration clipped by its
 * card are fine; so is a clipped text whose box (or the link around it) has
 * a `title` or an `aria-label`. A one-pixel rounding is tolerated.
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
	const { viewport, found } = await page.evaluate(measure, {
		include: list(include),
		exclude: list(exclude),
	});
	if (found.length > 0) {
		throw new Error(formatTextOverflow(found, viewport, max));
	}
}

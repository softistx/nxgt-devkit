import type { TapTargetBox } from './types';

export type Measured = {
	viewport: { width: number; height: number };
	boxes: TapTargetBox[];
};

/**
 * Measures every tap target under `include`, in CSS pixels. Self-contained:
 * Playwright serialises it, so it imports nothing at run time and every
 * helper lives inside it. It judges nothing about size; the caller does.
 * Three parts: the text helpers (`say`), the predicates (`is`) and the
 * geometry (`boxOf`).
 */
export async function measure(args: {
	targets: string[];
	include: string[];
	exclude: string[];
}): Promise<Measured> {
	// Web fonts change box sizes.
	await document.fonts.ready;
	// Duplicated on purpose with text-overflow/measure.ts (Playwright
	// serialises each measure alone): a change to collapse, brief or
	// describe is made in both.
	const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
	const say = {
		brief: (s: string) => (s.length > 40 ? `${s.slice(0, 40)}…` : s),
		describe: (el: Element) =>
			el.tagName.toLowerCase() +
			(el.id ? `#${el.id}` : '') +
			[...el.classList]
				.slice(0, 3)
				.map((c) => `.${c}`)
				.join(''),
		// The label a person would call it by.
		name: (el: Element) => {
			const labels = (el as HTMLInputElement).labels;
			const text =
				el.getAttribute('aria-label') ??
				(labels && labels.length > 0
					? [...labels].map((l) => l.textContent).join(' ')
					: null) ??
				el.textContent ??
				'';
			const fallback =
				el.getAttribute('alt') ??
				el.querySelector('img[alt]')?.getAttribute('alt') ??
				el.getAttribute('title') ??
				el.getAttribute('value') ??
				el.getAttribute('placeholder') ??
				'';
			return say.brief(collapse(text) || collapse(fallback));
		},
	};

	const is = {
		excluded: (el: Element) => args.exclude.some((s) => el.closest(s) !== null),
		// Shown only to a screen reader (`sr-only`: a 1px box, or `clip`).
		srOnly: (el: Element) => {
			const r = el.getBoundingClientRect();
			if (r.width <= 1 || r.height <= 1) return true;
			for (let p: Element | null = el; p; p = p.parentElement) {
				const s = getComputedStyle(p);
				if (
					(s.position === 'absolute' || s.position === 'fixed') &&
					(s.clip !== 'auto' || s.clipPath !== 'none')
				) {
					return true;
				}
			}
			return false;
		},
		// Not shown, not available, or not reachable by a pointer.
		unavailable: (el: Element) =>
			!el.checkVisibility({ visibilityProperty: true }) ||
			el.matches(':disabled') ||
			el.closest('[aria-disabled=true],[inert]') !== null ||
			getComputedStyle(el).pointerEvents === 'none',
		// A link in a sentence is WCAG 2.5.8's inline exception: its box is
		// the line's, and the text around it is the reader's. Only an inline
		// link: the text is looked for beside the outermost inline ancestor
		// (`<p><strong><a>`), in the block container.
		inline: (el: Element) => {
			if (getComputedStyle(el).display !== 'inline') return false;
			let top: Element = el;
			for (
				let p = el.parentElement;
				p && /^(inline|contents)$/.test(getComputedStyle(p).display);
				p = p.parentElement
			) {
				top = p;
			}
			return [...(top.parentElement?.childNodes ?? [])].some(
				(n) => n.nodeType === Node.TEXT_NODE && collapse(n.textContent ?? ''),
			);
		},
	};

	// Its box, joined with its labels' for a checkbox or a radio: a tap on the
	// label toggles it, and the input itself is often drawn small.
	const boxOf = (el: Element): TapTargetBox | null => {
		const rects = [el.getBoundingClientRect()];
		const input = el as HTMLInputElement;
		if (
			el instanceof HTMLInputElement &&
			/^(checkbox|radio)$/.test(input.type)
		) {
			for (const l of input.labels ?? []) rects.push(l.getBoundingClientRect());
		}
		const live = rects.filter((r) => r.width > 0 && r.height > 0);
		if (live.length === 0) return null;
		const left = Math.min(...live.map((r) => r.left));
		const top = Math.min(...live.map((r) => r.top));
		return {
			selector: say.describe(el),
			name: say.name(el),
			left,
			top,
			width: Math.max(...live.map((r) => r.right)) - left,
			height: Math.max(...live.map((r) => r.bottom)) - top,
		};
	};

	const roots = args.include.length
		? args.include.flatMap((s) => [...document.querySelectorAll(s)])
		: [document.documentElement];
	const seen = new Set<Element>();
	const boxes: TapTargetBox[] = [];
	for (const root of roots) {
		for (const el of root.querySelectorAll(args.targets.join(','))) {
			if (seen.has(el)) continue;
			seen.add(el);
			if (
				is.excluded(el) ||
				is.unavailable(el) ||
				is.srOnly(el) ||
				is.inline(el)
			)
				continue;
			const box = boxOf(el);
			if (box) boxes.push(box);
		}
	}
	return {
		viewport: { width: window.innerWidth, height: window.innerHeight },
		boxes,
	};
}

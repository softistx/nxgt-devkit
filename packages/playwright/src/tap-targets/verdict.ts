/** How a tap target fares: the box, then the hit area behind it. */
export type TapTargetVerdictKind =
	| 'large'
	| 'enlarged'
	| 'small'
	| 'covered'
	| 'hidden';

export type TapTargetVerdictOptions = {
	/** The side of the square a target must fill, in CSS pixels. Default `44`. */
	size?: number;
	/** The rounding slack: a box this close to `size` is large enough. Default `0.5`. */
	tolerance?: number;
	/** Count an invisible hit area (a `::before` / `::after`). Default `true`; `false` judges the visible box only. */
	hitArea?: boolean;
	/**
	 * Shared by the calls of one pass: the floating layers seen not to move
	 * (never waited for again). Optional; `expectTapTargets` passes one.
	 */
	memo?: { still: Set<Element>; idle: number };
};

export type TapTargetVerdict = {
	/**
	 * `large`: the box fills the square. `enlarged`: it is smaller, but its hit
	 * area fills the square centred on it. `small`: it does not. `covered`:
	 * another element still covers it once scrolled to the middle, so no
	 * pointer reaches it (not judged). `hidden`: it has no box.
	 */
	verdict: TapTargetVerdictKind;
	/** `large` or `enlarged`: a thumb hits it. */
	ok: boolean;
	/** The box in CSS pixels, joined with a checkbox's or radio's labels. */
	width: number;
	height: number;
};

/**
 * The tap-target verdict for ONE element, in the browser: the 44px (or
 * `size`) check `expectTapTargets` and `checkScreen` run, as a function a
 * Storybook play, a Vitest browser test or any page script can call.
 *
 * ```ts
 * import { tapTargetVerdict } from '@nxgt/playwright/tap-targets';
 * const { ok, width, height } = await tapTargetVerdict(button);
 * expect(ok, `${width}x${height}`).toBe(true);
 * ```
 *
 * It takes the element's own box (joined with its labels' for an
 * `<input>` checkbox or radio). A box under `size` still passes when a
 * `size` square centred on it, moved inside the viewport, is all hit (a 5x5
 * grid inset 1px) by the element, its descendants (`::before` / `::after`
 * count), or a checkbox's or radio's labels; a floating layer over part of
 * the square is measured through. An element that is off screen, clipped by
 * a scrolling ancestor or covered where it sits is scrolled to the middle
 * for the probe; every scroll position is put back. Hence async.
 *
 * Self-contained: Playwright serialises it (`expectTapTargets` runs this very
 * source in the page, one source for the check and for stories), so it
 * imports nothing at run time and every helper lives inside it, and it
 * touches no browser global at import time (the module loads in Node).
 * ACCEPTED LENGTH EXCEPTION, as `measure`'s.
 */
export async function tapTargetVerdict(
	el: Element,
	options: TapTargetVerdictOptions = {},
): Promise<TapTargetVerdict> {
	const size = options.size ?? 44;
	const tolerance = options.tolerance ?? 0.5;
	const useHitArea = options.hitArea ?? true;

	const labelsOf = (el: Element): HTMLLabelElement[] =>
		el instanceof HTMLInputElement && /^(checkbox|radio)$/.test(el.type)
			? [...(el.labels ?? [])]
			: [];
	// Its box, joined with its labels' for a checkbox or a radio.
	const rectOf = (el: Element) => {
		const live = [el, ...labelsOf(el)]
			.map((e) => e.getBoundingClientRect())
			.filter((r) => r.width > 0 && r.height > 0);
		if (live.length === 0) return null;
		const left = Math.min(...live.map((r) => r.left));
		const top = Math.min(...live.map((r) => r.top));
		return {
			left,
			top,
			width: Math.max(...live.map((r) => r.right)) - left,
			height: Math.max(...live.map((r) => r.bottom)) - top,
		};
	};

	// The viewport without a classic scrollbar. In quirks mode (no doctype)
	// the root's client size is the whole document's, and the body's is the
	// viewport's.
	const viewport = () => {
		const root =
			document.compatMode === 'BackCompat' && document.body
				? document.body
				: document.documentElement;
		return { cw: root.clientWidth, ch: root.clientHeight };
	};
	// The next ancestor along the flat tree: a slotted node continues in its
	// slot, the top of a shadow tree in its host.
	const flatParent = (p: Element): Element | null =>
		p.assignedSlot ?? p.parentElement ?? hostOf(p);
	const hostOf = (p: Element): Element | null => {
		const root = p.getRootNode();
		return root instanceof ShadowRoot ? root.host : null;
	};
	// Whether the square is within the visible (client) area of every
	// ancestor that clips or scrolls. The document's own scrolling is the
	// viewport's, checked by `square`.
	const visibleInAncestors = (el: Element, x: number, y: number) => {
		for (let p = flatParent(el); p; p = flatParent(p)) {
			if (p === document.documentElement || p === document.body) continue;
			const s = getComputedStyle(p);
			if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
			const r = p.getBoundingClientRect();
			const left = r.left + p.clientLeft;
			const top = r.top + p.clientTop;
			if (
				x < left ||
				y < top ||
				x + size > left + p.clientWidth ||
				y + size > top + p.clientHeight
			) {
				return false;
			}
		}
		return true;
	};
	// The `size` square centred on the box, moved inside the viewport. `inside`:
	// it fit without moving.
	const square = (r: {
		left: number;
		top: number;
		width: number;
		height: number;
	}) => {
		const { cw, ch } = viewport();
		const x = r.left + r.width / 2 - size / 2;
		const y = r.top + r.height / 2 - size / 2;
		const fit = (v: number, max: number) =>
			Math.min(Math.max(v, 0), max - size);
		return {
			x: fit(x, cw),
			y: fit(y, ch),
			inside: x >= 0 && y >= 0 && x <= cw - size && y <= ch - size,
		};
	};
	// Whether `hit` is the target, inside it, or inside one of its labels.
	const owns = (el: Element, labels: HTMLLabelElement[], hit: Element) =>
		el.contains(hit) || labels.some((l) => l.contains(hit));
	// The elements on top at the points of the 5x5 grid inset 1px that miss
	// the target (`null`: nothing there).
	const misses = (el: Element, x0: number, y0: number) => {
		const labels = labelsOf(el);
		const out: (Element | null)[] = [];
		for (let i = 0; i < 5; i++) {
			for (let j = 0; j < 5; j++) {
				const hit = document.elementFromPoint(
					x0 + 1 + (i * (size - 2)) / 4,
					y0 + 1 + (j * (size - 2)) / 4,
				);
				if (!hit || !owns(el, labels, hit)) out.push(hit);
			}
		}
		return out;
	};
	// What is on top at the centre (moved inside the viewport) of each of
	// the target's boxes and its labels'.
	const atCentres = (el: Element) => {
		const { cw, ch } = viewport();
		return [el, ...labelsOf(el)]
			.flatMap((e) => [...e.getClientRects()])
			.filter((r) => r.width > 0 && r.height > 0)
			.map((r) =>
				document.elementFromPoint(
					Math.min(Math.max(r.left + r.width / 2, 0), cw - 1),
					Math.min(Math.max(r.top + r.height / 2, 0), ch - 1),
				),
			);
	};
	// Whether a pointer reaches the target: at the centre of one of its boxes
	// or its labels' (an inline link that wraps has one per line; a checkbox
	// is tapped through its label). Nothing under any of them is no proof of
	// a cover.
	const reached = (el: Element) => {
		const labels = labelsOf(el);
		const hit = atCentres(el).filter((h) => h !== null);
		return hit.length === 0 || hit.some((h) => owns(el, labels, h));
	};
	// The positioned layers (outermost below the target's ancestors) under the
	// points that miss it: only those can a scroll listener move. `fixed` or
	// `sticky`, or `absolute` against the document (a portalled popper; one
	// inside a row scrolls with it and cannot go stale).
	const movable = (p: Element) => {
		const { position } = getComputedStyle(p);
		if (position === 'fixed' || position === 'sticky') return true;
		if (position !== 'absolute') return false;
		const parent = (p as HTMLElement).offsetParent;
		return (
			!parent || parent === document.body || parent === document.documentElement
		);
	};
	const layersAt = (
		el: Element,
		candidate: boolean,
		x0: number,
		y0: number,
	) => {
		const labels = labelsOf(el);
		const roots = new Set<Element>();
		const over = [...(candidate ? misses(el, x0, y0) : []), ...atCentres(el)];
		for (const hit of over) {
			if (!hit || owns(el, labels, hit)) continue;
			let root: Element | null = null;
			for (
				let p: Element | null = hit;
				p && !p.contains(el);
				p = p.parentElement
			) {
				if (movable(p)) root = p;
			}
			if (root) roots.add(root);
		}
		return roots;
	};
	// Layers seen not to move during a wait: never waited for again. After
	// five waits in a row in which nothing moved, no wait for the rest of the
	// call.
	const memo = options.memo ?? { still: new Set<Element>(), idle: 0 };
	const still = memo.still;

	// A floating layer (a menu, a listbox, a dialog, a tooltip, a toast, an
	// open popover or dialog) that does not hold the target: one that opens
	// over part of a hit area is measured through, a plain neighbour is not.
	// It floats: in the top layer, or `fixed` / `absolute`, itself or an
	// ancestor below the target's (an inline `role=alert` error in the flow is
	// a neighbour). A positioned wrapper that holds only such a layer is part
	// of it; one that holds other content too is a neighbour.
	const layer =
		'[role=menu],[role=listbox],[role=dialog],[role=alertdialog],[role=tooltip],[role=status],[role=alert],:popover-open,dialog[open]';
	const floats = (l: Element, el: Element) => {
		if (l.matches(':popover-open,dialog:modal')) return true;
		// Up to the first ancestor that also holds the target: a fixed app
		// shell around both does not make an inline alert float.
		for (let p: Element | null = l; p && !p.contains(el); p = p.parentElement) {
			if (/^(fixed|absolute)$/.test(getComputedStyle(p).position)) return true;
		}
		return false;
	};
	// The layer a positioned wrapper holds and nothing else (a popper's
	// wrapper portals one content element in): down its only children, with
	// no text beside them, to a layer that is shown (a role matches a closed
	// menu or an empty live region too).
	const wrapped = (p: Element) => {
		let c: Element | null = p;
		while (c && !c.matches(layer)) {
			for (const n of c.childNodes) {
				if (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) return null;
			}
			c = c.children.length === 1 ? c.firstElementChild : null;
		}
		if (!c) return null;
		const r = c.getBoundingClientRect();
		const shown = c.checkVisibility({ visibilityProperty: true });
		return r.width > 0 && r.height > 0 && shown ? c : null;
	};
	const inLayer = (el: Element, hit: Element) => {
		const l = hit.closest(layer);
		if (l) return !l.contains(el) && floats(l, el);
		// Up to the first ancestor that also holds the target, as `floats`.
		for (
			let p: Element | null = hit;
			p && !p.contains(el);
			p = p.parentElement
		) {
			if (!/^(fixed|absolute)$/.test(getComputedStyle(p).position)) continue;
			if (wrapped(p)) return true;
		}
		return false;
	};
	// Whether the square is all hit. Misses that land only on floating layers
	// are probed again with those elements transparent to the pointer
	// (`pointer-events: none`; their `style` attribute put back after), once
	// the target is reached at all: one a layer hides whole stays covered.
	// Any other miss fails.
	const hits = (el: Element, x0: number, y0: number) => {
		const saved = new Map<Element, string | null>();
		try {
			for (let round = 0; round < 25; round++) {
				const missed = misses(el, x0, y0);
				if (missed.length === 0) return true;
				if (!missed.every((m) => m && 'style' in m && inLayer(el, m))) {
					return false;
				}
				if (round === 0 && !reached(el)) return false;
				for (const m of missed as (Element & ElementCSSInlineStyle)[]) {
					if (!saved.has(m)) saved.set(m, m.getAttribute('style'));
					m.style.setProperty('pointer-events', 'none', 'important');
				}
			}
			return false;
		} finally {
			for (const [m, style] of saved) {
				if (style === null) m.removeAttribute('style');
				else m.setAttribute('style', style);
			}
		}
	};
	// Two frames, for the page's own scroll listeners (a popper that follows
	// its anchor) to move their layers; a timer only when frames do not run.
	const settle = () =>
		new Promise<void>((done) => {
			const timer = setTimeout(done, 500);
			requestAnimationFrame(() =>
				requestAnimationFrame(() => {
					clearTimeout(timer);
					done();
				}),
			);
		});

	const pseudoContent = (e: Element) =>
		['::before', '::after'].some(
			(p) => !/^(none|normal)$/.test(getComputedStyle(e, p).content),
		);
	// Whether the target could have a hit area larger than its box: a
	// pseudo-element with content on it, on a label of a checkbox or radio, or
	// on a descendant; a descendant drawn outside the box; a shadow tree (a
	// custom element may draw anything in one, closed ones included).
	const custom = (e: Element) => e.tagName.includes('-') || !!e.shadowRoot;
	const mayEnlarge = (box: {
		left: number;
		top: number;
		width: number;
		height: number;
	}): boolean => {
		const roots = [el, ...labelsOf(el)];
		if (
			roots.some((r) => custom(r) || [...r.querySelectorAll('*')].some(custom))
		)
			return true;
		const outside = (d: Element) => {
			const r = d.getBoundingClientRect();
			return (
				r.width > 0 &&
				r.height > 0 &&
				(r.left < box.left - tolerance ||
					r.top < box.top - tolerance ||
					r.right > box.left + box.width + tolerance ||
					r.bottom > box.top + box.height + tolerance)
			);
		};
		return roots.some(
			(r) =>
				pseudoContent(r) ||
				[...r.querySelectorAll('*')].some(
					(d) => pseudoContent(d) || outside(d),
				),
		);
	};
	type Verdict = 'enlarged' | 'covered' | 'small';
	const judge = async (el: Element, candidate: boolean): Promise<Verdict> => {
		const { cw, ch } = viewport();
		if (cw < size || ch < size) return 'small';
		const before = rectOf(el);
		if (!before) return 'small';
		const at = square(before);
		if (at.inside && visibleInAncestors(el, at.x, at.y)) {
			if (candidate && hits(el, at.x, at.y)) return 'enlarged';
			if (!candidate && reached(el)) return 'small';
		}
		// Off screen, the square sticks out, a scrolling ancestor hides it, or
		// something is on top where it sits (a sticky actions bar): scroll the
		// target to the middle, probe again, and put everything back (an
		// unrestored scroll changes what the next check sees). A target still
		// covered there (`reached`) is out of reach in this state: it is not
		// judged. A square the page's edge still keeps out is moved inside
		// the viewport, so a full `size` square of hit area is on screen.
		const saved: [Element, number, number][] = [];
		for (let p = flatParent(el); p; p = flatParent(p)) {
			saved.push([p, p.scrollLeft, p.scrollTop]);
		}
		const { scrollX, scrollY } = window;
		const probe = (): Verdict => {
			const moved = rectOf(el);
			if (!moved) return 'small';
			const to = square(moved);
			if (candidate && hits(el, to.x, to.y)) return 'enlarged';
			return reached(el) ? 'small' : 'covered';
		};
		// A miss right after the scroll may be a layer the page has not moved
		// yet: it is probed once more when the page has settled, and the page
		// settles again once the scroll is put back.
		let waited = false;
		try {
			el.scrollIntoView({
				block: 'center',
				inline: 'center',
				behavior: 'instant',
			});
			const first = probe();
			if (first === 'enlarged' || (first === 'small' && !candidate)) {
				return first;
			}
			const moved = rectOf(el);
			const to = moved && square(moved);
			const layers = to
				? [...layersAt(el, candidate, to.x, to.y)].filter((l) => !still.has(l))
				: [];
			// Nothing positioned that could still move: the miss stands.
			if (layers.length === 0 || memo.idle >= 5) return first;
			const before = layers.map((l) => l.getBoundingClientRect());
			waited = true;
			await settle();
			let anyMoved = false;
			layers.forEach((l, i) => {
				const a = before[i];
				const b = l.getBoundingClientRect();
				if (
					a &&
					a.x === b.x &&
					a.y === b.y &&
					a.width === b.width &&
					a.height === b.height
				) {
					still.add(l);
				} else {
					anyMoved = true;
				}
			});
			memo.idle = anyMoved ? 0 : memo.idle + 1;
			const second = probe();
			// A retry may clear a miss, never hide one: reached, it stays judged.
			return first === 'small' && second === 'covered' ? first : second;
		} finally {
			for (const [p, left, top] of saved) {
				if (p.scrollLeft !== left || p.scrollTop !== top) {
					p.scrollTo({ left, top, behavior: 'instant' });
				}
			}
			window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
			if (waited) await settle();
		}
	};

	const own = rectOf(el);
	if (!own) return { verdict: 'hidden', ok: false, width: 0, height: 0 };
	const sizes = { width: own.width, height: own.height };
	if (own.width >= size - tolerance && own.height >= size - tolerance) {
		return { verdict: 'large', ok: true, ...sizes };
	}
	if (!useHitArea) return { verdict: 'small', ok: false, ...sizes };
	const verdict = await judge(el, mayEnlarge(own));
	return {
		verdict: verdict === 'small' ? 'small' : verdict,
		ok: verdict === 'enlarged',
		...sizes,
	};
}

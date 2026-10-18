import type { Measured } from './measure';

/**
 * Probes the undersized tap targets `measure` listed: whether a pointer
 * reaches them at all, and, for those that could have an invisible hit area,
 * whether it fills the `size` square.
 * Meant for `handle.evaluate(probeHitAreas, { size })` on the handle
 * `page.evaluateHandle(measure, …)` returned: it receives the elements
 * `measure` selected (`result.elements`; `result.data.undersized` and
 * `result.data.probe` the positions to probe) and never selects again, so
 * the page changing between the two calls (a hydration, a class removed)
 * cannot make it test another element. One that is no longer connected is
 * skipped, and gets neither verdict.
 *
 * Self-contained: Playwright serialises it, so it imports nothing at run
 * time (the `Measured` import is a type) and every helper lives inside it.
 * ACCEPTED LENGTH EXCEPTION: it is long for that reason, as `measure` is.
 * `labelsOf` / `rectOf` copy `measure`'s label join (`boxOf`) because the
 * rects are re-read after scrolling: a change to one is made in both.
 *
 * Unlike `measure` it scrolls: a target whose `size` square is not on screen
 * (or not inside the visible area of its scrolling ancestors), or is covered
 * where it sits (a sticky or fixed bar on top), is scrolled to the middle,
 * probed again, and every scrolled ancestor (along the flat tree, so shadow
 * roots and slots count) and the window are put back.
 *
 * @returns `enlarged`: the indices whose `size` square is hit, at every
 * point of a 5x5 grid inset 1px, by the target, its descendants (a
 * `::before` / `::after` hit-tests as its element) or, for a checkbox or
 * radio, its labels. `covered`: the indices another element still covers
 * once scrolled to the middle, at the centre of each of their boxes (each
 * line of a wrapped link) and their labels' (a toast, a modal layer, the
 * front toast of a stack): no pointer reaches them in this state.
 */
export function probeHitAreas(
	result: Measured,
	args: { size: number },
): { enlarged: number[]; covered: number[] } {
	const { size } = args;

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
	const hits = (el: Element, x0: number, y0: number) => {
		const labels = labelsOf(el);
		for (let i = 0; i < 5; i++) {
			for (let j = 0; j < 5; j++) {
				const hit = document.elementFromPoint(
					x0 + 1 + (i * (size - 2)) / 4,
					y0 + 1 + (j * (size - 2)) / 4,
				);
				if (!hit || !owns(el, labels, hit)) return false;
			}
		}
		return true;
	};
	// Whether a pointer reaches the target: at the centre (moved inside the
	// viewport) of one of its boxes or its labels' (an inline link that wraps
	// has one per line; a checkbox is tapped through its label). Nothing
	// under any of them is no proof of a cover.
	const reached = (el: Element) => {
		const { cw, ch } = viewport();
		const labels = labelsOf(el);
		let probed = false;
		for (const r of [el, ...labels].flatMap((e) => [...e.getClientRects()])) {
			if (r.width <= 0 || r.height <= 0) continue;
			const x = Math.min(Math.max(r.left + r.width / 2, 0), cw - 1);
			const y = Math.min(Math.max(r.top + r.height / 2, 0), ch - 1);
			const hit = document.elementFromPoint(x, y);
			if (!hit) continue;
			if (owns(el, labels, hit)) return true;
			probed = true;
		}
		return !probed;
	};

	type Verdict = 'enlarged' | 'covered' | 'small';
	const judge = (el: Element, candidate: boolean): Verdict => {
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
		try {
			el.scrollIntoView({
				block: 'center',
				inline: 'center',
				behavior: 'instant',
			});
			const moved = rectOf(el);
			if (!moved) return 'small';
			const to = square(moved);
			if (candidate && hits(el, to.x, to.y)) return 'enlarged';
			return reached(el) ? 'small' : 'covered';
		} finally {
			for (const [p, left, top] of saved) {
				if (p.scrollLeft !== left || p.scrollTop !== top) {
					p.scrollTo({ left, top, behavior: 'instant' });
				}
			}
			window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
		}
	};

	const candidates = new Set(result.data.probe);
	const enlarged: number[] = [];
	const covered: number[] = [];
	for (const i of result.data.undersized) {
		const el = result.elements[i];
		if (!el?.isConnected) continue;
		const verdict = judge(el, candidates.has(i));
		if (verdict === 'enlarged') enlarged.push(i);
		if (verdict === 'covered') covered.push(i);
	}
	return { enlarged, covered };
}

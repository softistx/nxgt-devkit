/**
 * Probes the real hit area of the undersized tap targets `measure` listed.
 * Self-contained: Playwright serialises it, so it imports nothing at run time
 * and every helper lives inside it. It re-runs `measure`'s selection (same
 * `targets`, `include`, `exclude` and skip rules) to find the same elements
 * in the same order; `indices` are positions in that order.
 *
 * DUPLICATED ON PURPOSE with `measure.ts` (Playwright serialises each alone):
 * `collapse`, the skip predicates (`is`), the `roots` / `targets` selection
 * loop and the checkbox / radio union box (`rectOf`, `boxOf` there). A change
 * to one is made in both; AGENTS.md lists the duplication.
 *
 * Unlike `measure` it scrolls: a target whose `size` square is not on screen
 * is scrolled to the middle, probed, and every scrolled ancestor (along the
 * flat tree, so shadow roots and slots count) and the window are put back.
 *
 * @returns the indices whose `size` square is hit, at every point of a 5x5
 * grid inset 1px, by the target, its descendants (a `::before` / `::after`
 * hit-tests as its element) or, for a checkbox or radio, its labels.
 */
export async function probeHitAreas(args: {
	size: number;
	targets: string[];
	include: string[];
	exclude: string[];
	indices: number[];
}): Promise<number[]> {
	await document.fonts.ready;
	const { size } = args;
	const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();
	const is = {
		excluded: (el: Element) => args.exclude.some((s) => el.closest(s) !== null),
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
		unavailable: (el: Element) =>
			!el.checkVisibility({ visibilityProperty: true }) ||
			el.matches(':disabled') ||
			el.closest('[aria-disabled=true],[inert]') !== null ||
			getComputedStyle(el).pointerEvents === 'none',
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

	// The targets in the order `measure` boxed them.
	const roots = args.include.length
		? args.include.flatMap((s) => [...document.querySelectorAll(s)])
		: [document.documentElement];
	const seen = new Set<Element>();
	const selected: Element[] = [];
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
			if (rectOf(el)) selected.push(el);
		}
	}

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
	const hits = (el: Element, x0: number, y0: number) => {
		const labels = labelsOf(el);
		for (let i = 0; i < 5; i++) {
			for (let j = 0; j < 5; j++) {
				const hit = document.elementFromPoint(
					x0 + 1 + (i * (size - 2)) / 4,
					y0 + 1 + (j * (size - 2)) / 4,
				);
				if (
					!hit ||
					!(el.contains(hit) || labels.some((l) => l.contains(hit)))
				) {
					return false;
				}
			}
		}
		return true;
	};
	// The next ancestor along the flat tree: a slotted node continues in its
	// slot, the top of a shadow tree in its host.
	const flatParent = (p: Element): Element | null =>
		p.assignedSlot ??
		p.parentElement ??
		(p.getRootNode() as ShadowRoot).host ??
		null;

	const covers = (el: Element): boolean => {
		const { cw, ch } = viewport();
		if (cw < size || ch < size) return false;
		const before = rectOf(el);
		if (!before) return false;
		const at = square(before);
		if (at.inside) return hits(el, at.x, at.y);
		// Off screen, or the square sticks out: scroll the target to the middle,
		// probe, and put everything back (an unrestored scroll changes what the
		// next check sees). A square the page's edge still keeps out is moved
		// inside the viewport, so a full `size` square of hit area is on screen.
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
			if (!moved) return false;
			const to = square(moved);
			return hits(el, to.x, to.y);
		} finally {
			for (const [p, left, top] of saved) {
				if (p.scrollLeft !== left || p.scrollTop !== top) {
					p.scrollTo({ left, top, behavior: 'instant' });
				}
			}
			window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
		}
	};

	return args.indices.filter((i) => {
		const el = selected[i];
		return el !== undefined && covers(el);
	});
}

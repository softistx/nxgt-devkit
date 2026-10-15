import type { SmallTapTarget, TapTargetBox } from './types';

/** Rounding of the layout: a 43.6px box is a 44px target. */
const TOLERANCE = 0.5;

const contains = (a: TapTargetBox, b: TapTargetBox) =>
	a.left <= b.left + TOLERANCE &&
	a.top <= b.top + TOLERANCE &&
	a.left + a.width >= b.left + b.width - TOLERANCE &&
	a.top + a.height >= b.top + b.height - TOLERANCE;

const center = (b: TapTargetBox) => ({
	x: b.left + b.width / 2,
	y: b.top + b.height / 2,
});

/** Whether a circle of `diameter` centred on `of` touches the rectangle `other`. */
function circleTouches(
	of: TapTargetBox,
	other: TapTargetBox,
	diameter: number,
): boolean {
	const c = center(of);
	const dx = Math.max(other.left - c.x, 0, c.x - (other.left + other.width));
	const dy = Math.max(other.top - c.y, 0, c.y - (other.top + other.height));
	return Math.hypot(dx, dy) < diameter / 2;
}

/**
 * The target that crowds `box`, if any: another target's rectangle, or the
 * circle of another undersized target, touching its circle. A target that
 * contains `box` or sits inside it is the same control, not a neighbour.
 */
function crowdedBy(
	box: TapTargetBox,
	all: readonly TapTargetBox[],
	small: ReadonlySet<TapTargetBox>,
	size: number,
): TapTargetBox | undefined {
	return all.find((other) => {
		if (other === box || contains(other, box) || contains(box, other)) {
			return false;
		}
		if (circleTouches(box, other, size)) return true;
		if (!small.has(other)) return false;
		const a = center(box);
		const b = center(other);
		return Math.hypot(a.x - b.x, a.y - b.y) < size;
	});
}

/**
 * Judges the measured targets: the ones smaller than `size` by `size`, and,
 * with `spacing`, among them only those a neighbour crowds.
 */
export function judgeTapTargets(
	boxes: readonly TapTargetBox[],
	{ size, spacing }: { size: number; spacing: boolean },
): SmallTapTarget[] {
	const small = new Set(
		boxes.filter(
			(b) => b.width < size - TOLERANCE || b.height < size - TOLERANCE,
		),
	);
	const found: SmallTapTarget[] = [];
	for (const box of small) {
		const near = spacing ? crowdedBy(box, boxes, small, size) : undefined;
		if (spacing && !near) continue;
		found.push({
			selector: box.selector,
			name: box.name,
			width: Math.round(box.width),
			height: Math.round(box.height),
			...(near ? { near: near.selector } : {}),
		});
	}
	return found;
}

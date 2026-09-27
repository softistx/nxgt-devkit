export type Box = { left: number; top: number; right: number; bottom: number };

export function union(a: Box, b: Box): Box {
	return {
		left: Math.min(a.left, b.left),
		top: Math.min(a.top, b.top),
		right: Math.max(a.right, b.right),
		bottom: Math.max(a.bottom, b.bottom),
	};
}

/**
 * `box` clipped to `by` on the axes that clip — an ancestor with only
 * `overflow-x: hidden` still lets content hang out vertically. Undefined when
 * less than a pixel is left on either axis.
 */
export function clip(
	box: Box,
	by: Box,
	axes: { x: boolean; y: boolean },
): Box | undefined {
	const clipped = {
		left: axes.x ? Math.max(box.left, by.left) : box.left,
		top: axes.y ? Math.max(box.top, by.top) : box.top,
		right: axes.x ? Math.min(box.right, by.right) : box.right,
		bottom: axes.y ? Math.min(box.bottom, by.bottom) : box.bottom,
	};
	return clipped.right - clipped.left < 1 || clipped.bottom - clipped.top < 1
		? undefined
		: clipped;
}

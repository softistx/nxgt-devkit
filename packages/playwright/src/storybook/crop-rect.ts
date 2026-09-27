import type { Box } from './painted-box';

export type Rect = { x: number; y: number; width: number; height: number };

/**
 * Maps `box` (CSS pixels, viewport coordinates) plus `padding` onto a
 * screenshot of `frame` — the element that was screenshotted, in the same
 * coordinates — that came back `image` pixels large. The ratio and the origin
 * are the frame's, not the viewport's: a body narrowed by
 * `previewCapture.width` is screenshotted at that width. Without a box, the
 * whole image.
 */
export function cropRect(
	box: Box | undefined,
	frame: Box,
	image: { width: number; height: number },
	padding: number,
): Rect {
	if (!box) return { x: 0, y: 0, ...image };
	const ratio = image.width / (frame.right - frame.left);
	const x = Math.max(0, (box.left - padding - frame.left) * ratio);
	const y = Math.max(0, (box.top - padding - frame.top) * ratio);
	const right = Math.min(
		image.width,
		(box.right + padding - frame.left) * ratio,
	);
	const bottom = Math.min(
		image.height,
		(box.bottom + padding - frame.top) * ratio,
	);
	return { x, y, width: right - x, height: bottom - y };
}

import type { Box } from './box';
import { cropRect } from './crop-rect';

export type WebpOptions = {
	padding: number;
	maxWidth: number;
	quality: number;
};

/**
 * A browser that cannot encode a format answers `toDataURL` with PNG data
 * instead of failing (WebKit does this for WebP), which would be written under
 * a `.webp` name. Throws when `url` is not WebP.
 *
 * A zero-size canvas, or one beyond the browser's size limit, answers
 * `"data:,"` in every browser: that is the canvas's fault, not the browser's,
 * so it is named first (`size` is the canvas's, for the message).
 */
export function assertWebp(
	url: string,
	size: { width: number; height: number } = { width: 0, height: 0 },
): void {
	if (url === 'data:,')
		throw new Error(
			`The preview canvas is ${size.width}x${size.height}: canvas.toDataURL returned "data:," because it is empty or beyond the browser's canvas size limit. Capture a smaller crop, or check that the story renders something.`,
		);
	if (url.startsWith('data:image/webp')) return;
	throw new Error(
		'This browser cannot encode WebP previews: canvas.toDataURL("image/webp") returned another format (WebKit does this). Capture with chromium or firefox.',
	);
}

/**
 * Crops a PNG screenshot of `frame` to `box` plus `padding`, scales it to
 * `maxWidth`, and encodes WebP through a canvas — in the browser, so no native
 * image library.
 * Returns base64 without the `data:` prefix.
 */
export async function toWebp(
	pngBase64: string,
	box: Box | undefined,
	frame: Box,
	{ padding, maxWidth, quality }: WebpOptions,
): Promise<string> {
	const image = new Image();
	image.src = `data:image/png;base64,${pngBase64}`;
	await image.decode();
	const crop = cropRect(box, frame, image, padding);
	const { width, height } = crop;
	const scale = Math.min(1, maxWidth / width);
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(width * scale);
	canvas.height = Math.round(height * scale);
	canvas
		.getContext('2d')
		?.drawImage(
			image,
			crop.x,
			crop.y,
			width,
			height,
			0,
			0,
			canvas.width,
			canvas.height,
		);
	const url = canvas.toDataURL('image/webp', quality);
	assertWebp(url, canvas);
	return url.slice(url.indexOf(',') + 1);
}

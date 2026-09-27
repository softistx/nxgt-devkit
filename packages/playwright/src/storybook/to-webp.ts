import type { Box } from './painted-box';

export type WebpOptions = {
	padding: number;
	maxWidth: number;
	quality: number;
};

/**
 * Crops a PNG screenshot to `box` plus `padding`, scales it to `maxWidth`, and
 * encodes WebP through a canvas — in the browser, so no native image library.
 * Returns base64 without the `data:` prefix.
 */
export async function toWebp(
	pngBase64: string,
	box: Box | undefined,
	{ padding, maxWidth, quality }: WebpOptions,
): Promise<string> {
	const image = new Image();
	image.src = `data:image/png;base64,${pngBase64}`;
	await image.decode();
	// The screenshot is in device pixels, the box in CSS pixels.
	const ratio = image.width / window.innerWidth;
	const crop = box
		? {
				x: Math.max(0, (box.left - padding) * ratio),
				y: Math.max(0, (box.top - padding) * ratio),
				right: Math.min(image.width, (box.right + padding) * ratio),
				bottom: Math.min(image.height, (box.bottom + padding) * ratio),
			}
		: { x: 0, y: 0, right: image.width, bottom: image.height };
	const width = crop.right - crop.x;
	const height = crop.bottom - crop.y;
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
	return url.slice(url.indexOf(',') + 1);
}

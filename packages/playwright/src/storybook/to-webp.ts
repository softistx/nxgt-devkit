import type { Box } from './box';
import { cropRect } from './crop-rect';

export type WebpOptions = {
	padding: number;
	maxWidth: number;
	quality: number;
};

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
	return url.slice(url.indexOf(',') + 1);
}

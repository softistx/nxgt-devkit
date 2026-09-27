import { describe, expect, it } from 'bun:test';
import { cropRect } from './crop-rect';

const viewport = { left: 0, top: 0, right: 1200, bottom: 800 };

describe('cropRect', () => {
	it('is the whole image without a box', () => {
		expect(
			cropRect(undefined, viewport, { width: 1200, height: 800 }, 24),
		).toEqual({ x: 0, y: 0, width: 1200, height: 800 });
	});

	it('pads the box and clamps it to the image', () => {
		const box = { left: 10, top: 100, right: 300, bottom: 200 };
		expect(cropRect(box, viewport, { width: 1200, height: 800 }, 24)).toEqual({
			x: 0,
			y: 76,
			width: 324,
			height: 148,
		});
	});

	it('scales to device pixels', () => {
		const box = { left: 100, top: 100, right: 200, bottom: 200 };
		expect(cropRect(box, viewport, { width: 2400, height: 1600 }, 0)).toEqual({
			x: 200,
			y: 200,
			width: 200,
			height: 200,
		});
	});

	// The regression: a body narrowed to 420px by `previewCapture.width` is
	// screenshotted 420px wide, so the ratio is 1, not 420 / innerWidth.
	it('uses the frame, not the viewport, for a narrowed body', () => {
		const body = { left: 0, top: 0, right: 420, bottom: 300 };
		const box = { left: 16, top: 16, right: 404, bottom: 120 };
		expect(cropRect(box, body, { width: 420, height: 300 }, 16)).toEqual({
			x: 0,
			y: 0,
			width: 420,
			height: 136,
		});
	});

	it('offsets by the frame origin', () => {
		const frame = { left: 50, top: 20, right: 450, bottom: 320 };
		const box = { left: 100, top: 70, right: 200, bottom: 170 };
		expect(cropRect(box, frame, { width: 400, height: 300 }, 0)).toEqual({
			x: 50,
			y: 50,
			width: 100,
			height: 100,
		});
	});
});

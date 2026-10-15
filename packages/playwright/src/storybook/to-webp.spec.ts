import { describe, expect, test } from 'bun:test';
import { assertWebp } from './to-webp';

describe('assertWebp', () => {
	test('accepts a WebP data URL', () => {
		expect(() => assertWebp('data:image/webp;base64,UklGR')).not.toThrow();
	});

	test('rejects the PNG data WebKit answers with', () => {
		expect(() => assertWebp('data:image/png;base64,iVBOR')).toThrow(
			'This browser cannot encode WebP previews',
		);
	});

	test('names the canvas, not the browser, for an empty data URL', () => {
		expect(() => assertWebp('data:,', { width: 0, height: 120 })).toThrow(
			'The preview canvas is 0x120: canvas.toDataURL returned "data:,"',
		);
	});
});

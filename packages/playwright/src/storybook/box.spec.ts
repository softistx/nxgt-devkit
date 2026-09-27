import { describe, expect, it } from 'bun:test';
import { clip, union } from './box';

const both = { x: true, y: true };

describe('union', () => {
	it('spans both boxes', () => {
		expect(
			union(
				{ left: 10, top: 10, right: 20, bottom: 20 },
				{ left: 0, top: 15, right: 30, bottom: 18 },
			),
		).toEqual({ left: 0, top: 10, right: 30, bottom: 20 });
	});
});

describe('clip', () => {
	const viewport = { left: 0, top: 0, right: 600, bottom: 400 };

	it('cuts an editor layer to its scroller', () => {
		const layer = { left: 0, top: 0, right: 16_777_216, bottom: 380 };
		expect(clip(layer, viewport, both)).toEqual({
			left: 0,
			top: 0,
			right: 600,
			bottom: 380,
		});
	});

	it('leaves an axis that does not clip alone', () => {
		const menu = { left: 20, top: 300, right: 200, bottom: 700 };
		expect(clip(menu, viewport, { x: true, y: false })).toEqual(menu);
	});

	it('is undefined when the box is scrolled out of view', () => {
		const row = { left: 0, top: 500, right: 600, bottom: 540 };
		expect(clip(row, viewport, both)).toBeUndefined();
	});
});

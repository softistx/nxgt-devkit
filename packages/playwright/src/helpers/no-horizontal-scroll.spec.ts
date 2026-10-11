import { describe, expect, test } from 'bun:test';
import { formatOverflow } from './no-horizontal-scroll';

describe('formatOverflow', () => {
	test('lists the widest elements past the edge', () => {
		expect(
			formatOverflow({
				scrollWidth: 640,
				clientWidth: 412,
				elements: [{ selector: 'table.data', right: 640, width: 624 }],
			}),
		).toBe(
			[
				'The page scrolls horizontally: scrollWidth 640px > clientWidth 412px.',
				'Widest elements past the right edge:',
				'  - table.data  right 640px, width 624px',
			].join('\n'),
		);
	});

	test('says where to look when no element is past the edge', () => {
		expect(
			formatOverflow({ scrollWidth: 420, clientWidth: 412, elements: [] }),
		).toContain('negative margin or a transform');
	});
});

describe('formatOverflow for an inner scroll container', () => {
	test('names the container', () => {
		expect(
			formatOverflow({
				scrollWidth: 700,
				clientWidth: 412,
				container: 'div.shell',
				elements: [{ selector: 'pre', right: 700, width: 680 }],
			}).split('\n')[0],
		).toBe(
			'The scroll container div.shell scrolls horizontally: scrollWidth 700px > clientWidth 412px.',
		);
	});
});

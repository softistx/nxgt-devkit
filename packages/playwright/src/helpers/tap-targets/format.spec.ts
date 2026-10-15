import { describe, expect, test } from 'bun:test';
import { formatTapTargets } from './format';
import type { SmallTapTarget } from './types';

const viewport = { width: 412, height: 839 };
const close: SmallTapTarget = {
	selector: 'button.icon',
	name: 'Close',
	width: 32,
	height: 32,
};

describe('formatTapTargets', () => {
	test('lists the targets, then says what to do', () => {
		expect(
			formatTapTargets(
				[
					close,
					{ ...close, selector: 'a#home', name: '', width: 20, height: 18 },
				],
				viewport,
			),
		).toBe(
			[
				'2 tap targets are smaller than 44x44px (412x839 viewport):',
				'  - button.icon "Close"  32x32px',
				'  - a#home  20x18px',
				'Make each at least 44x44px (padding, or min-width and min-height, on the element itself), or exclude it.',
			].join('\n'),
		);
	});

	test('a single target is singular', () => {
		expect(formatTapTargets([close], viewport).split('\n')[0]).toBe(
			'1 tap target is smaller than 44x44px (412x839 viewport):',
		);
	});

	test('names the size it was given and the neighbour that crowds a target', () => {
		const message = formatTapTargets([{ ...close, near: 'a.next' }], viewport, {
			size: 48,
		});
		expect(message.split('\n')[0]).toContain('smaller than 48x48px');
		expect(message).toContain('32x32px, too close to a.next');
	});

	test('counts them all and lists at most max', () => {
		const message = formatTapTargets(
			Array.from({ length: 7 }, () => close),
			viewport,
			{ max: 2 },
		);
		expect(message.split('\n')[0]).toContain('7 tap targets');
		expect(message.match(/^ {2}- /gm)).toHaveLength(2);
		expect(message).toContain('  … and 5 more');
	});
});

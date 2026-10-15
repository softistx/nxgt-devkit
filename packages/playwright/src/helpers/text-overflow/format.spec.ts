import { describe, expect, test } from 'bun:test';
import { formatTextOverflow } from './format';
import type { OverflowingText } from './types';

const viewport = { width: 412, height: 839 };
const clipped: OverflowingText = {
	selector: 'span.title',
	text: 'Quarterly report for the…',
	kind: 'clipped',
	ellipsis: true,
	textWidth: 312,
	boxWidth: 180,
	axis: 'x',
};
const spills: OverflowingText = {
	selector: 'button#save',
	text: 'Enregistrer les modifications',
	kind: 'spills',
	ellipsis: false,
	textWidth: 160,
	boxWidth: 120,
	axis: 'x',
};

describe('formatTextOverflow', () => {
	test('lists clipped and spilling texts, then says what to do', () => {
		expect(formatTextOverflow([clipped, spills], viewport)).toBe(
			[
				'Text overflows its box in 2 elements (412x839 viewport):',
				'  - span.title  clipped with an ellipsis, no title: "Quarterly report for the…"  312px of text in a 180px box',
				'  - button#save  spills: "Enregistrer les modifications"  160px of text in a 120px box',
				'Let the text wrap, give a clipped one its full text in a title or aria-label, or exclude it.',
			].join('\n'),
		);
	});

	test('a single element is not plural; a clip without an ellipsis says so', () => {
		const message = formatTextOverflow(
			[{ ...clipped, ellipsis: false }],
			viewport,
		);
		expect(message.split('\n')[0]).toBe(
			'Text overflows its box in 1 element (412x839 viewport):',
		);
		expect(message).toContain('clipped, no title:');
	});

	test('a clamped text is measured in height', () => {
		expect(
			formatTextOverflow(
				[{ ...clipped, axis: 'y', textWidth: 96, boxWidth: 48 }],
				viewport,
			),
		).toContain('96px of text in a 48px-tall box');
	});

	test('counts them all and lists at most max', () => {
		const message = formatTextOverflow(
			Array.from({ length: 7 }, () => spills),
			viewport,
			{ max: 2 },
		);
		expect(message.split('\n')[0]).toContain('in 7 elements');
		expect(message.match(/^ {2}- /gm)).toHaveLength(2);
		expect(message).toContain('  … and 5 more');
	});
});

import { describe, expect, test } from 'bun:test';
import { judgeTapTargets } from './judge';
import type { TapTargetBox } from './types';

const box = (
	selector: string,
	left: number,
	top: number,
	width: number,
	height = width,
): TapTargetBox => ({ selector, name: '', left, top, width, height });
const strict = { size: 44, spacing: false };
const spaced = { size: 44, spacing: true };
const selectors = (found: { selector: string }[]) =>
	found.map((f) => f.selector);

describe('judgeTapTargets', () => {
	test('44x44 passes, 43.6 is rounding, 40 fails, a thin one fails', () => {
		const found = judgeTapTargets(
			[
				box('a.ok', 0, 0, 44),
				box('a.round', 0, 100, 43.6, 44),
				box('a.small', 0, 200, 40),
				box('a.thin', 0, 300, 120, 24),
			],
			strict,
		);
		expect(selectors(found)).toEqual(['a.small', 'a.thin']);
		expect(found[1]).toMatchObject({ width: 120, height: 24 });
	});

	test('without spacing, a lone small target still fails', () => {
		expect(selectors(judgeTapTargets([box('a.x', 0, 0, 20)], strict))).toEqual([
			'a.x',
		]);
	});

	test('with spacing, a lone small target passes', () => {
		expect(judgeTapTargets([box('a.x', 0, 0, 20)], spaced)).toEqual([]);
	});

	test('with spacing, a target another one touches fails and names it', () => {
		const found = judgeTapTargets(
			[box('a.x', 0, 0, 20), box('a.big', 30, 0, 100)],
			spaced,
		);
		expect(found).toMatchObject([{ selector: 'a.x', near: 'a.big' }]);
	});

	test('with spacing, two small targets whose circles meet both fail', () => {
		const found = judgeTapTargets(
			[box('a.1', 0, 0, 20), box('a.2', 100, 0, 20), box('a.3', 140, 0, 20)],
			spaced,
		);
		expect(selectors(found)).toEqual(['a.2', 'a.3']);
	});

	test('with spacing, a target inside another is not its neighbour', () => {
		expect(
			judgeTapTargets(
				[box('a.card', 0, 0, 200, 100), box('button.x', 10, 10, 20)],
				spaced,
			),
		).toEqual([]);
	});
});

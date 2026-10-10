import { describe, expect, test } from 'bun:test';
import { type A11yOptions, assertDisabledRules, DEFAULT_TAGS } from './options';

describe('DEFAULT_TAGS', () => {
	test('WCAG 2.0, 2.1 and 2.2, levels A and AA', () => {
		expect(DEFAULT_TAGS).toEqual([
			'wcag2a',
			'wcag2aa',
			'wcag21a',
			'wcag21aa',
			'wcag22aa',
		]);
	});
});

describe('disableRules', () => {
	test('a rule with a reason is accepted', () => {
		expect(() =>
			assertDisabledRules([
				{ rule: 'color-contrast', reason: 'brand palette, tracked in #12' },
			]),
		).not.toThrow();
		expect(() => assertDisabledRules()).not.toThrow();
	});

	test('a bare rule id is a type error, and refused at run time', () => {
		// @ts-expect-error each disabled rule needs a reason
		const options: A11yOptions = { disableRules: ['color-contrast'] };
		expect(() => assertDisabledRules(options.disableRules)).toThrow(
			'names no rule',
		);
	});

	test('a missing reason is a type error, and refused at run time', () => {
		// @ts-expect-error `reason` is required
		const options: A11yOptions = { disableRules: [{ rule: 'region' }] };
		expect(() => assertDisabledRules(options.disableRules)).toThrow(
			'"region" is disabled without a reason',
		);
	});

	test('a blank reason is refused', () => {
		expect(() =>
			assertDisabledRules([{ rule: 'region', reason: '  ' }]),
		).toThrow('"region" is disabled without a reason');
	});
});

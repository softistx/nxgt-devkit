import { expect, test } from 'bun:test';
import { isProduction, isProductionIn } from './shared';

test('NODE_ENV=production is production, with or without Vite', () => {
	expect(isProductionIn('production', undefined)).toBe(true);
	expect(isProductionIn('production', false)).toBe(true);
});

test('import.meta.env.PROD is production where NODE_ENV says nothing', () => {
	expect(isProductionIn(undefined, true)).toBe(true);
	expect(isProductionIn('development', true)).toBe(true);
});

test('it fails open: unset, development and PROD false are not production', () => {
	expect(isProductionIn(undefined, undefined)).toBe(false);
	expect(isProductionIn('development', false)).toBe(false);
	expect(isProductionIn('test', undefined)).toBe(false);
});

test('isProduction reads the real NODE_ENV and tolerates a missing import.meta.env', () => {
	const before = process.env.NODE_ENV;
	try {
		process.env.NODE_ENV = 'production';
		expect(isProduction()).toBe(true);
		process.env.NODE_ENV = 'test';
		expect(isProduction()).toBe(false);
	} finally {
		process.env.NODE_ENV = before;
	}
});

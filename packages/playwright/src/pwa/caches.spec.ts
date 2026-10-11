import { describe, expect, test } from 'bun:test';
import { cacheProblems, filledCacheUrl } from './caches';

describe('cacheProblems', () => {
	const names = ['app-precache-v2', 'app-assets-v2', 'app-pages-v1'];

	test('an exact name keeps that cache and must be there', () => {
		expect(cacheProblems(['app-precache-v2'], 'app-precache-v2')).toEqual({
			unexpected: [],
			missing: [],
		});
		expect(cacheProblems(names, 'app-precache-v2')).toEqual({
			unexpected: ['app-assets-v2', 'app-pages-v1'],
			missing: [],
		});
		expect(cacheProblems([], 'app-precache-v2')).toEqual({
			unexpected: [],
			missing: ['app-precache-v2'],
		});
	});

	test('a pattern or a predicate keeps what it matches, and requires nothing', () => {
		expect(cacheProblems(names, /precache/)).toEqual({
			unexpected: ['app-assets-v2', 'app-pages-v1'],
			missing: [],
		});
		expect(cacheProblems([], /precache/)).toEqual({
			unexpected: [],
			missing: [],
		});
		expect(cacheProblems(names, (name) => !name.includes('pages'))).toEqual({
			unexpected: ['app-pages-v1'],
			missing: [],
		});
	});

	test('a list keeps what any of its matchers keeps', () => {
		expect(
			cacheProblems(names, ['app-precache-v2', /assets/, 'fonts']),
		).toEqual({ unexpected: ['app-pages-v1'], missing: ['fonts'] });
		expect(cacheProblems(names, [])).toEqual({
			unexpected: names,
			missing: [],
		});
	});
});

test('filledCacheUrl encodes the cache name into one path segment', () => {
	expect(filledCacheUrl('app-v1')).toBe('/__nxgt-filled/app-v1');
	expect(filledCacheUrl('a/b c')).toBe('/__nxgt-filled/a%2Fb%20c');
});

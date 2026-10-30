import { describe, expect, test } from 'bun:test';
import { withScope } from './scope';
import { scoped, scopedCounter, scopedValue } from './scoped-state';

describe('scoped', () => {
	test('keeps one instance per scope, created lazily', () => {
		let made = 0;
		const list = scoped(() => {
			made += 1;
			return new Map<string, number>();
		});
		expect(made).toBe(0);
		withScope('a', () => list.set('x', 1));
		withScope('b', () => list.set('x', 2));
		expect(made).toBe(2);
		expect(withScope('a', () => list.get('x'))).toBe(1);
		expect(withScope('b', () => list.get('x'))).toBe(2);
		expect(list.size).toBe(0); // default scope, a third instance
		expect(made).toBe(3);
	});

	test('behaves as the object: size, iteration, delete, in, keys', () => {
		const record = scoped(() => ({}) as Record<string, number>);
		withScope('a', () => {
			record.one = 1;
			expect('one' in record).toBe(true);
			expect(Object.keys(record)).toEqual(['one']);
			delete record.one;
			expect('one' in record).toBe(false);
		});
		const set = scoped(() => new Set<number>());
		withScope('a', () => {
			set.add(1);
			expect([...set]).toEqual([1]);
		});
		expect([...set]).toEqual([]);
	});

	test('arrays work through the proxy', () => {
		const items = scoped(() => [] as number[]);
		withScope('a', () => items.push(1, 2));
		expect(withScope('a', () => items.length)).toBe(2);
		expect(items.length).toBe(0);
	});
});

describe('scopedValue', () => {
	test('holds one value per scope, starting from initial()', () => {
		const flag = scopedValue(() => false);
		withScope('a', () => flag.set(true));
		expect(withScope('a', () => flag.get())).toBe(true);
		expect(withScope('b', () => flag.get())).toBe(false);
		expect(flag.get()).toBe(false);
	});

	test('a replaced array stays in its scope', () => {
		const rows = scopedValue<number[]>(() => []);
		withScope('a', () => rows.set([1]));
		expect(withScope('a', () => rows.get())).toEqual([1]);
		expect(rows.get()).toEqual([]);
	});
});

describe('scopedCounter', () => {
	test('counts and resets per scope', () => {
		const ids = scopedCounter();
		expect(withScope('a', () => [ids.next(), ids.next()])).toEqual([1, 2]);
		expect(withScope('b', () => ids.next())).toBe(1);
		withScope('a', () => ids.reset());
		expect(withScope('a', () => ids.next())).toBe(1);
		expect(withScope('b', () => ids.next())).toBe(2);
		expect(ids.next()).toBe(1);
	});
});

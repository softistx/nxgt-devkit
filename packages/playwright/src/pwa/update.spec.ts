import { expect, test } from 'bun:test';
import { appendVersionComment } from './update';

test('appendVersionComment keeps the source and makes it differ', () => {
	const source = "self.addEventListener('install', () => {});";
	const next = appendVersionComment(source);
	expect(next.startsWith(source)).toBe(true);
	expect(next).not.toBe(source);
	expect(next).toMatch(/\n\/\/ next version \d+\n$/);
});

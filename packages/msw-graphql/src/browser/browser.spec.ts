import { expect, test } from 'bun:test';
import { enableMocking } from './index';
import { resolveHandlers } from './resolve-handlers';

test('does nothing, and loads nothing, when disabled', async () => {
	let loaded = false;
	const worker = await enableMocking({
		enabled: false,
		handlers: async () => {
			loaded = true;
			return [];
		},
	});
	expect(worker).toBeNull();
	expect(loaded).toBe(false);
});

test('accepts an array, a `handlers` export or a default export', () => {
	const list = [] as never[];
	expect(resolveHandlers(list)).toBe(list);
	expect(resolveHandlers({ handlers: list })).toBe(list);
	expect(resolveHandlers({ default: list })).toBe(list);
});

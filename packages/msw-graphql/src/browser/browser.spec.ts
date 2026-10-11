import { expect, test } from 'bun:test';
import { enableMocking } from './index';

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

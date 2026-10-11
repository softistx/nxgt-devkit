import { expect, test } from 'bun:test';
import { loadSdl } from './index';

const file = new URL('./fixture.graphql', import.meta.url);

test('reads the file under Node and Bun', async () => {
	expect(await loadSdl({ file })).toContain('type Query');
});

test('prefers the file when Vite is not detected', async () => {
	const sdl = await loadSdl({
		file,
		vite: async () => {
			throw new Error('the Vite branch must not run here');
		},
	});
	expect(sdl).toContain('type Query');
});

test('uses the Vite callback alone, accepting a module or a string', async () => {
	expect(await loadSdl({ vite: async () => 'type Q' })).toBe('type Q');
	expect(await loadSdl({ vite: async () => ({ default: 'type M' }) })).toBe(
		'type M',
	);
});

test('needs a source', async () => {
	await expect(loadSdl({})).rejects.toThrow('needs a `vite` callback');
});

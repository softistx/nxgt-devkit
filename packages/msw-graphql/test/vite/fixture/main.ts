import { loadSdl } from '../../../src/sdl';

// Both sources, as an app spells them: Vite inlines the `?raw` import and
// never reaches the file branch in the browser; Node and Bun read the file.
export const sdl = await loadSdl({
	vite: () => import('./schema.graphql?raw'),
	file: new URL('./schema.graphql', import.meta.url),
});

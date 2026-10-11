import { afterAll, beforeAll, expect, test } from 'bun:test';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';

const root = join(import.meta.dir, 'fixture');
const SDL = (await Bun.file(join(root, 'schema.graphql')).text()).trim();
let out = '';
let bundle = '';
let entry = '';

beforeAll(async () => {
	out = await mkdtemp(join(tmpdir(), 'msw-graphql-vite-'));
	await build({
		root,
		logLevel: 'silent',
		configFile: false,
		build: {
			outDir: out,
			emptyOutDir: true,
			minify: false,
			// A library build of the fixture's entry: one ES module to import.
			lib: { entry: join(root, 'main.ts'), formats: ['es'], fileName: 'main' },
			target: 'esnext',
		},
	});
	const files = await readdir(out);
	entry = join(out, files.find((f) => f.startsWith('main')) ?? 'missing');
	bundle = (
		await Promise.all(
			files
				.filter((f) => f.endsWith('.js'))
				.map((f) => readFile(join(out, f), 'utf8')),
		)
	).join('\n');
});
afterAll(() => rm(out, { recursive: true, force: true }));

test('a Vite build inlines the SDL of the ?raw import', () => {
	expect(bundle).toContain('vitefixture: String');
});

test('the built output imports no Node module statically', () => {
	// The file branch is a dynamic import Vite is told to leave alone, so a
	// browser bundle never resolves node:fs.
	expect(bundle).not.toMatch(/^import .* from ["']node:/m);
});

test('the built module resolves the SDL, through the Vite branch', async () => {
	const { sdl } = (await import(entry)) as { sdl: string };
	expect(sdl.trim()).toBe(SDL);
});

test('the Node branch reads the file when there is no Vite', async () => {
	// Under Bun, `import.meta.env` is process.env: loadSdl takes the file.
	const { loadSdl } = await import('../../src/sdl');
	const sdl = await loadSdl({
		vite: () => Promise.reject(new Error('the Vite branch must not run')),
		file: new URL('./fixture/schema.graphql', import.meta.url),
	});
	expect(sdl.trim()).toBe(SDL);
});

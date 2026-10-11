export type LoadSdlOptions = {
	/**
	 * Where Vite finds the SDL. The `?raw` import must stay a literal in the
	 * app, because Vite can only inline what it sees:
	 * `vite: () => import('~/graphql/schema.graphql?raw')`.
	 */
	vite?: () => Promise<string | { default: string }>;
	/** Where Node (and Bun) read it: `new URL('../graphql/schema.graphql', import.meta.url)`. */
	file?: URL | string;
};

/**
 * Vite defines BASE_URL, MODE, DEV, PROD and SSR on `import.meta.env`. Bun
 * aliases `import.meta.env` to `process.env`, whose values are strings, so
 * the boolean `DEV` tells the two apart.
 */
function underVite(): boolean {
	const env = (import.meta as { env?: Record<string, unknown> }).env;
	return typeof env?.DEV === 'boolean' && typeof env?.BASE_URL === 'string';
}

/**
 * The schema's SDL, from whichever source the runtime can reach: Vite's `?raw`
 * import in the browser and in Vite's dev server, a file read in Node, Bun and
 * Playwright's loader. The Node branch is a dynamic import Vite is told to
 * leave alone, so a browser bundle never resolves `node:fs`.
 */
export async function loadSdl(options: LoadSdlOptions): Promise<string> {
	const { vite, file } = options;
	if (!vite && !file) {
		throw new Error('loadSdl needs a `vite` callback, a `file`, or both.');
	}
	if (vite && (underVite() || typeof window !== 'undefined' || !file)) {
		const loaded = await vite();
		return typeof loaded === 'string' ? loaded : loaded.default;
	}
	if (!file) throw new Error('loadSdl: no `file` to read.');
	const fs = 'node:fs/promises';
	const { readFile } = await import(/* @vite-ignore */ fs);
	return readFile(file, 'utf8');
}

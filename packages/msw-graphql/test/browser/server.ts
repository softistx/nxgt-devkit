import { join } from 'node:path';

/**
 * A tiny test server: the page, its bundle (built for the browser by
 * `Bun.build` from `app.ts`, which imports the package's own sources) and msw's
 * worker script. It answers `/graphql` with a 404, so only msw can answer it.
 */
const dir = import.meta.dir;
const build = await Bun.build({
	entrypoints: [join(dir, 'app.ts')],
	target: 'browser',
	splitting: true,
	outdir: join(dir, '.out'),
});
if (!build.success) {
	for (const log of build.logs) console.error(log);
	process.exit(1);
}
const worker = Bun.file(
	join(dir, '../../node_modules/msw/lib/mockServiceWorker.js'),
);

const page = `<!doctype html><meta charset="utf-8"><title>mocks</title>
<body data-ready="no"><script type="module" src="/app.js"></script></body>`;

Bun.serve({
	port: 4598,
	async fetch(request) {
		const { pathname } = new URL(request.url);
		if (pathname === '/') {
			return new Response(page, { headers: { 'content-type': 'text/html' } });
		}
		if (pathname === '/mockServiceWorker.js') {
			return new Response(worker, {
				headers: { 'content-type': 'text/javascript' },
			});
		}
		const asset = Bun.file(join(dir, '.out', pathname));
		if (pathname !== '/' && (await asset.exists())) return new Response(asset);
		// No real API behind /graphql: a mock that works is msw's.
		return new Response('no API here', { status: 404 });
	},
});
console.log('listening on http://localhost:4598');

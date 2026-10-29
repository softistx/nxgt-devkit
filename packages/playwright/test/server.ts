// The app the e2e specs drive: a form whose input is reset once shortly after
// load, the way hydration resets a controlled input, and a submit that calls
// an API msw answers in the specs; pages that hydrate late, and a service
// worker, for the hydration and PWA helpers.
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mockState, scopeOf } from '@nxgt/msw-graphql';
import { createMockControl } from '@nxgt/msw-graphql/control';

const PORT = Number(process.env.PW_PORT) || 4599;
// Where `/versioned-sw.js?id=<id>` is read from, per request: a spec writes
// its own worker there and `nextWorkerVersion` edits it (e2e/pwa.pw.ts names
// the same folder).
const VERSIONED_DIR = join(tmpdir(), 'nxgt-playwright-probe');

const form = /* html */ `<!doctype html>
<title>Form</title>
<input data-pw="name" />
<button data-pw="submit" disabled>Save</button>
<p data-pw="result"></p>
<script>
	const input = document.querySelector('[data-pw=name]');
	const submit = document.querySelector('[data-pw=submit]');
	// "Hydration": 250ms after load the value is reset, once.
	setTimeout(() => { input.value = ''; submit.disabled = true; }, 250);
	input.addEventListener('input', () => { submit.disabled = !input.value; });
	submit.addEventListener('click', async () => {
		const res = await fetch('/api/greeting?name=' + encodeURIComponent(input.value));
		document.querySelector('[data-pw=result]').textContent = await res.text();
	});
</script>`;

const html = (body: string) =>
	new Response(`<!doctype html><title>Probe</title>${body}`, {
		headers: { 'content-type': 'text/html' },
	});

// Pages that "hydrate" HYDRATE_MS after load: their button does nothing
// before, and the marker an adapter reads is set then.
const HYDRATE_MS = 600;
const PAGES: Record<string, () => Response> = {
	// The default marker: <html data-hydrated>.
	'/hydrating': () =>
		html(`<button data-pw="go">Go</button><p data-pw="out"></p>
<script>
	setTimeout(() => {
		document.querySelector('[data-pw=go]').addEventListener('click', () => {
			document.querySelector('[data-pw=out]').textContent = 'clicked';
		});
		document.documentElement.dataset.hydrated = '';
	}, ${HYDRATE_MS});
</script>`),
	// What React Router and React leave behind once hydrated.
	'/react-router': () =>
		html(`<button data-pw="late" hidden>Late</button>
<script>
	setTimeout(() => {
		window.__reactRouterDataRouter = {};
		document.body.__reactFiber$probe = {};
		const late = document.querySelector('[data-pw=late]');
		late.hidden = false;
		setTimeout(() => { late.__reactProps$probe = {}; }, ${HYDRATE_MS});
	}, ${HYDRATE_MS});
</script>`),
	'/never': () => html('<p>Never hydrates.</p>'),
	'/mismatch': () =>
		html(`<script>
	console.error('Warning: Text content did not match. Server: "1" Client: "2"');
	console.warn('Hydration failed because the initial UI does not match');
	console.log('hydrated, says a log line that is not a warning');
	console.error('An unrelated error');
</script>`),
	'/data.json': () => Response.json({ ok: true }),
	// A service worker that precaches two URLs, claims its clients, and
	// answers from its cache when the network fails (it stores nothing else).
	'/sw-page': () =>
		html(`<script>navigator.serviceWorker.register('/sw.js');</script>`),
	'/sw.js': () =>
		new Response(
			`self.addEventListener('install', (event) => {
	event.waitUntil(caches.open('probe-v1').then((cache) => cache.addAll(['/sw-page', '/data.json?v=1'])));
	self.skipWaiting();
});
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
	event.respondWith(
		fetch(event.request).catch(() =>
			caches.match(event.request).then((cached) => cached ?? Response.error()),
		),
	);
});`,
			{ headers: { 'content-type': 'text/javascript' } },
		),
};

// The control channel of @nxgt/msw-graphql, mounted the way an SSR app mounts
// it, over a recording stand-in for the msw server: e2e/mock-server.pw.ts
// drives it with `createMockServerTest` and reads `/__state` back, which is
// the contract spec between the two packages' wire types.
const record = {
	resets: 0,
	overrides: [] as unknown[],
	scenarios: [] as unknown[],
};
const control = createMockControl({
	server: {
		use: (...handlers) => {
			record.overrides.push(...handlers);
		},
		resetHandlers: () => {
			record.overrides = [];
		},
	},
	reset: () => {
		record.resets++;
		record.scenarios = [];
	},
	scenarios: {
		remove: (args) => {
			record.scenarios.push({ name: 'remove', args });
		},
		empty: () => {
			record.scenarios.push({ name: 'empty' });
		},
	},
});

// Pages under a Content-Security-Policy for e2e/csp.pw.ts: the nonce is new on
// each request (`/csp/fixed` never changes it), and `/csp/inline` runs a script
// the policy refuses.
const FIXED_NONCE = 'Zml4ZWQtbm9uY2UtdmFsdWU=';
function cspPage(name: string): Response | undefined {
	const nonce =
		name === 'fixed' ? FIXED_NONCE : randomBytes(16).toString('base64');
	const policy =
		name === 'short'
			? "script-src 'nonce-abc'"
			: `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
	const bodies: Record<string, string> = {
		good: `<link rel="modulepreload" href="/csp/module.js" nonce="${nonce}">
<script nonce="${nonce}">document.title = 'ran';</script>`,
		fixed: `<script nonce="${nonce}">document.title = 'ran';</script>`,
		// The second script has no nonce: the policy refuses it, the page is fine.
		missing: `<script nonce="${nonce}">document.title = 'ran';</script>
<script>document.title = 'refused';</script>`,
		inline: `<script>document.title = 'refused';</script>`,
		bare: '<p>No scripts.</p>',
		// A nonce under 16 characters.
		short: '<script nonce="abc">1</script>',
	};
	const body = bodies[name];
	if (body === undefined) return undefined;
	return new Response(`<!doctype html><title>Csp</title>${body}`, {
		headers: { 'content-type': 'text/html', 'content-security-policy': policy },
	});
}

Bun.serve({
	port: PORT,
	async fetch(request) {
		const url = new URL(request.url);
		const controlled = await control.handle(request);
		if (controlled) return controlled;
		// The scope this request carries and the forced failure it would see:
		// e2e/mock-scope.pw.ts runs two workers against it.
		if (url.pathname === '/__scope') {
			const scope = scopeOf(request);
			return Response.json({
				scope: scope ?? null,
				failing: (scope && mockState.scopes.get(scope)?.failing) || null,
			});
		}
		if (url.pathname === '/__state') {
			return Response.json({
				failing: mockState.failing,
				resets: record.resets,
				overrides: record.overrides.length,
				scenarios: record.scenarios,
			});
		}
		if (url.pathname === '/login') {
			return new Response(
				'<!doctype html><title>Sign In</title><h1>Sign in</h1>',
				{
					headers: { 'content-type': 'text/html' },
				},
			);
		}
		const id = (url.searchParams.get('id') ?? '').replace(/[^\w-]/g, '');
		if (url.pathname === '/versioned-page') {
			return html(
				`<script>navigator.serviceWorker.register('/versioned-sw.js?id=${id}');</script>`,
			);
		}
		if (url.pathname === '/versioned-sw.js') {
			const file = Bun.file(join(VERSIONED_DIR, `${id}.js`));
			if (!(await file.exists())) return new Response('', { status: 404 });
			return new Response(await file.text(), {
				headers: {
					'content-type': 'text/javascript',
					'cache-control': 'no-cache',
				},
			});
		}
		if (url.pathname === '/csp/module.js') {
			return new Response('export const csp = true;', {
				headers: { 'content-type': 'text/javascript' },
			});
		}
		if (url.pathname.startsWith('/csp/')) {
			const csp = cspPage(url.pathname.slice('/csp/'.length));
			if (csp) return csp;
		}
		if (url.pathname === '/csp-none') return html('<script>1</script>');
		const page = PAGES[url.pathname];
		if (page) return page();
		if (url.pathname === '/api/greeting') {
			return new Response(`server:${url.searchParams.get('name')}`);
		}
		return new Response(form, { headers: { 'content-type': 'text/html' } });
	},
});
console.log(`e2e app on http://localhost:${PORT}`);

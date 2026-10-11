// The app the e2e specs drive: a form whose input is reset once shortly after
// load, the way hydration resets a controlled input, and a submit that calls
// an API msw answers in the specs; pages that hydrate late, and a service
// worker, for the hydration and PWA helpers.
const PORT = Number(process.env.PW_PORT) || 4599;

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
	// A service worker that precaches two URLs and claims its clients.
	'/sw-page': () =>
		html(`<script>navigator.serviceWorker.register('/sw.js');</script>`),
	'/sw.js': () =>
		new Response(
			`self.addEventListener('install', (event) => {
	event.waitUntil(caches.open('probe-v1').then((cache) => cache.addAll(['/sw-page', '/data.json?v=1'])));
	self.skipWaiting();
});
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));`,
			{ headers: { 'content-type': 'text/javascript' } },
		),
};

Bun.serve({
	port: PORT,
	fetch(request) {
		const url = new URL(request.url);
		if (url.pathname === '/login') {
			return new Response(
				'<!doctype html><title>Sign In</title><h1>Sign in</h1>',
				{
					headers: { 'content-type': 'text/html' },
				},
			);
		}
		const page = PAGES[url.pathname];
		if (page) return page();
		if (url.pathname === '/api/greeting') {
			return new Response(`server:${url.searchParams.get('name')}`);
		}
		return new Response(form, { headers: { 'content-type': 'text/html' } });
	},
});
console.log(`e2e app on http://localhost:${PORT}`);

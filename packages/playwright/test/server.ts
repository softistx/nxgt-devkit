// The app the e2e specs drive: a form whose input is reset once shortly after
// load, the way hydration resets a controlled input, and a submit that calls
// an API msw answers in the specs.
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
		if (url.pathname === '/api/greeting') {
			return new Response(`server:${url.searchParams.get('name')}`);
		}
		return new Response(form, { headers: { 'content-type': 'text/html' } });
	},
});
console.log(`e2e app on http://localhost:${PORT}`);

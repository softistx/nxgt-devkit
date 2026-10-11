#!/usr/bin/env bun

/**
 * Does the installed msw's Node server intercept Bun's native `fetch`?
 *
 *   bun run scripts/bun-fetch-probe.ts
 *
 * Measured on Bun 1.4.2: msw 2.15 does (prints `intercepted`), msw 3.0.3 does
 * not (prints `NOT intercepted`, after Bun logs `Failed to replace a global
 * value at "_wrapHandle"`). msw 3's Node interceptors patch `node:net`, which
 * Bun's fetch never goes through. An app whose server runs on Bun and wants
 * `startMockServer` therefore stays on msw 2; the same app run by Node >= 22.12
 * can use msw 3. Exits 0 either way: it reports, it does not assert.
 */
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
	http.get('http://probe.test/x', () => HttpResponse.json({ ok: true })),
);
// msw 3 renamed `onUnhandledRequest` to `onUnhandledFrame`; each ignores the other.
server.listen({
	onUnhandledFrame: 'bypass',
	onUnhandledRequest: 'bypass',
} as never);
try {
	const response = await fetch('http://probe.test/x');
	console.log(
		(await response.json()).ok ? 'intercepted' : 'NOT intercepted (odd body)',
	);
} catch {
	console.log('NOT intercepted');
} finally {
	server.close();
}

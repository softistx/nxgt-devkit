#!/usr/bin/env bun

/**
 * Does the installed msw's Node server intercept Bun's native `fetch`?
 *
 *   bun run scripts/bun-fetch-probe.ts
 *
 * Measured on Bun 1.4.2: msw 2.15 does (prints `intercepted`), msw 3.0.3 does
 * not (prints `NOT intercepted`, after Bun logs `Failed to replace a global
 * value at "_wrapHandle"`). msw 3's Node interceptors patch `node:net`, which
 * Bun's fetch never goes through. `startMockServer` works around it under Bun
 * with msw 3 (it patches `fetch` and uses `getResponse`); this probe shows the
 * plain `setupServer` failure that workaround exists for. Exits 0 either way
 * unless told what to expect:
 *
 *   bun run scripts/bun-fetch-probe.ts --expect intercepted      # msw 2
 *   bun run scripts/bun-fetch-probe.ts --expect not-intercepted  # msw 3
 *
 * With `--expect`, the exit code is 1 when the outcome differs.
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
const flag = Bun.argv.indexOf('--expect');
const expected = flag === -1 ? null : (Bun.argv[flag + 1] ?? '');
if (
	expected !== null &&
	!['intercepted', 'not-intercepted'].includes(expected)
) {
	console.error('--expect takes `intercepted` or `not-intercepted`.');
	process.exit(2);
}
let intercepted = false;
try {
	const response = await fetch('http://probe.test/x');
	intercepted = (await response.json()).ok === true;
	console.log(intercepted ? 'intercepted' : 'NOT intercepted (odd body)');
} catch {
	console.log('NOT intercepted');
} finally {
	server.close();
}
if (expected !== null && intercepted !== (expected === 'intercepted'))
	process.exit(1);

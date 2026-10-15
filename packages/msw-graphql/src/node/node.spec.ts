import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bypass, getResponse, HttpResponse, http, passthrough } from 'msw';
import { schema } from '../../test/schema';
import { createHandlerStore } from '../handlers';
import { bearerToken, createExecutor, graphqlEndpoint } from '../index';
import { createMockState } from '../state';
import { createFetchServer, isMsw3Server } from './bun-server';
import { startMockServer } from './index';

test('starts a server holding the given handlers', async () => {
	const handlers = [http.get('http://x.test/a', () => HttpResponse.json({}))];
	const { server } = startMockServer(handlers);
	try {
		expect(server.listHandlers()).toHaveLength(1);
		expect(
			await getResponse(handlers, new Request('http://x.test/a')),
		).toBeDefined();
	} finally {
		server.close();
	}
});

test('under NODE_ENV=production it throws before any server listens', () => {
	const before = process.env.NODE_ENV;
	process.env.NODE_ENV = 'production';
	try {
		expect(() => startMockServer([])).toThrow('NODE_ENV is "production"');
	} finally {
		process.env.NODE_ENV = before;
	}
});

test('a second call returns the first call’s server and control, and ignores its arguments', () => {
	const first = startMockServer([
		http.get('http://x.test/a', () => HttpResponse.json({})),
	]);
	try {
		const again = startMockServer([], { onUnhandledRequest: 'error' });
		expect(again).toBe(first);
		expect(again.server).toBe(first.server);
		expect(again.server.listHandlers()).toHaveLength(1);
	} finally {
		first.server.close();
	}
});

test('it is shared through globalThis, so a re-evaluated module finds it', () => {
	const key = Symbol.for('@nxgt/msw-graphql/node');
	const first = startMockServer([]);
	try {
		expect((globalThis as Record<symbol, unknown>)[key]).toBe(first);
	} finally {
		first.server.close();
	}
	expect((globalThis as Record<symbol, unknown>)[key]).toBeUndefined();
});

test('after close, the next call starts a new server', () => {
	const first = startMockServer([]);
	first.server.close();
	const second = startMockServer([]);
	try {
		expect(second.server).not.toBe(first.server);
	} finally {
		second.server.close();
	}
});

test('under production a call still throws and registers nothing', () => {
	const before = process.env.NODE_ENV;
	process.env.NODE_ENV = 'production';
	try {
		expect(() => startMockServer([])).toThrow('NODE_ENV is "production"');
	} finally {
		process.env.NODE_ENV = before;
	}
	expect(
		(globalThis as Record<symbol, unknown>)[
			Symbol.for('@nxgt/msw-graphql/node')
		],
	).toBeUndefined();
});

const registered = () =>
	(globalThis as Record<symbol, unknown>)[Symbol.for('@nxgt/msw-graphql/node')];

test('a stale close() on a replaced server does not unregister its successor', () => {
	const a = startMockServer([]);
	a.server.close();
	const b = startMockServer([]);
	try {
		// msw 3 throws on a second close ("already disabled"); msw 2 does not.
		// Either way the registry must still hold B.
		try {
			a.server.close();
		} catch {}
		expect(registered()).toBe(b);
		expect(startMockServer([])).toBe(b);
	} finally {
		b.server.close();
	}
});

test('dispose(), where msw has one, forgets the server like close()', () => {
	const a = startMockServer([]);
	const dispose = (a.server as { dispose?: () => void }).dispose?.bind(
		a.server,
	);
	if (!dispose) {
		a.server.close();
		return; // this msw has no public dispose()
	}
	dispose();
	expect(registered()).toBeUndefined();
	const b = startMockServer([]);
	try {
		expect(b.server).not.toBe(a.server);
		// A stale dispose() must not unregister the successor either.
		try {
			dispose();
		} catch {}
		expect(registered()).toBe(b);
	} finally {
		b.server.close();
	}
});

test('under production, a registered server is returned without throwing', () => {
	const first = startMockServer([]);
	const before = process.env.NODE_ENV;
	process.env.NODE_ENV = 'production';
	try {
		expect(startMockServer([])).toBe(first);
	} finally {
		process.env.NODE_ENV = before;
		first.server.close();
	}
});

// Under Bun, msw 3's `setupServer` intercepts nothing (mswjs/msw#2811), so
// startMockServer patches globalThis.fetch and resolves with getResponse. On
// msw 2 the same assertions hold through `setupServer`, which does intercept Bun's fetch.
test('a global fetch to a host nothing serves is answered by the handlers', async () => {
	const { server } = startMockServer(
		[http.get('http://unserved.invalid/a', () => HttpResponse.json({ a: 1 }))],
		{ onUnhandledRequest: 'bypass' },
	);
	try {
		const response = await fetch('http://unserved.invalid/a');
		expect(await response.json()).toEqual({ a: 1 });
		// server.use / resetHandlers are the surface the control drives.
		server.use(
			http.get('http://unserved.invalid/a', () => HttpResponse.json({ a: 2 })),
		);
		expect(await (await fetch('http://unserved.invalid/a')).json()).toEqual({
			a: 2,
		});
		server.resetHandlers();
		expect(await (await fetch('http://unserved.invalid/a')).json()).toEqual({
			a: 1,
		});
	} finally {
		server.close();
	}
});

test('after close(), fetch is no longer intercepted', async () => {
	const { server } = startMockServer([
		http.get('http://unserved.invalid/b', () => HttpResponse.json({})),
	]);
	server.close();
	await expect(fetch('http://unserved.invalid/b')).rejects.toThrow();
});

test('an unmatched request is bypassed, or errors with onUnhandledRequest: error', async () => {
	// A real local server: a bypassed request reaches it, so only the
	// 'error' policy can make the fetch reject.
	const real = Bun.serve({ port: 0, fetch: () => new Response('real') });
	const url = `http://localhost:${real.port}/c`;
	try {
		const bypass = startMockServer([]);
		try {
			expect(await (await fetch(url)).text()).toBe('real');
		} finally {
			bypass.server.close();
		}
		const strict = startMockServer([], { onUnhandledRequest: 'error' });
		try {
			await expect(fetch(url)).rejects.toThrow();
		} finally {
			strict.server.close();
		}
	} finally {
		await real.stop(true);
	}
});

// The Bun server itself, built directly so these hold on msw 2 as well.
const fetchServer = (...handlers: Parameters<typeof createFetchServer>[0]) =>
	createFetchServer(handlers);
const hello = http.get('http://unserved.invalid/h', () =>
	HttpResponse.text('mock'),
);

test('close() restores the exact original globalThis.fetch', () => {
	const original = globalThis.fetch;
	const server = fetchServer(hello);
	server.listen({ onUnhandledRequest: 'bypass' });
	expect(globalThis.fetch).not.toBe(original);
	server.close();
	expect(globalThis.fetch).toBe(original);
});

test('a second listen() throws like msw, and a listen() after close() works', () => {
	const original = globalThis.fetch;
	const server = fetchServer(hello);
	server.listen();
	try {
		expect(() => server.listen()).toThrow('already listening');
	} finally {
		server.close();
	}
	server.listen();
	server.close();
	expect(globalThis.fetch).toBe(original);
});

test('use() prepends, resetHandlers() returns to the initial ones or takes new ones, listHandlers() shows them', async () => {
	const server = fetchServer(hello);
	server.listen({ onUnhandledRequest: 'error' });
	try {
		const text = async () => (await fetch('http://unserved.invalid/h')).text();
		expect(await text()).toBe('mock');
		server.use(
			http.get('http://unserved.invalid/h', () => HttpResponse.text('over')),
		);
		expect(server.listHandlers()).toHaveLength(2);
		expect(await text()).toBe('over');
		server.resetHandlers();
		expect(await text()).toBe('mock');
		server.resetHandlers(
			http.get('http://unserved.invalid/h', () => HttpResponse.text('next')),
		);
		expect(await text()).toBe('next');
	} finally {
		server.close();
	}
});

test('restoreHandlers() makes a used `once` handler answer again', async () => {
	const server = fetchServer(
		http.get('http://unserved.invalid/o', () => HttpResponse.text('once'), {
			once: true,
		}),
	);
	server.listen({ onUnhandledRequest: 'bypass' });
	try {
		const first = await fetch('http://unserved.invalid/o');
		expect(await first.text()).toBe('once');
		// Used: the request now goes to the (unresolvable) network.
		await expect(fetch('http://unserved.invalid/o')).rejects.toThrow();
		server.restoreHandlers();
		expect(await (await fetch('http://unserved.invalid/o')).text()).toBe(
			'once',
		);
	} finally {
		server.close();
	}
});

test('bypass reaches a real server; error rejects the same URL; warn prints msw’s message and still sends it', async () => {
	const real = Bun.serve({ port: 0, fetch: () => new Response('real') });
	const url = `http://localhost:${real.port}/d?q=1`;
	const warn = console.warn;
	const error = console.error;
	const warnings: string[] = [];
	const errors: string[] = [];
	try {
		const server = fetchServer();
		server.listen({ onUnhandledRequest: 'bypass' });
		expect(await (await fetch(url)).text()).toBe('real');
		server.close();

		console.warn = (...args: unknown[]) => void warnings.push(args.join(' '));
		server.listen({ onUnhandledRequest: 'warn' });
		expect(await (await fetch(url)).text()).toBe('real');
		server.close();
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain(
			'[MSW] Warning: intercepted a request without a matching request handler:',
		);
		expect(warnings[0]).toContain(`GET http://localhost:${real.port}/d?q=1`);

		console.error = (...args: unknown[]) => void errors.push(args.join(' '));
		server.listen({ onUnhandledRequest: 'error' });
		await expect(fetch(url)).rejects.toThrow(
			'Cannot bypass a request when using the "error" strategy',
		);
		server.close();
		expect(errors[0]).toContain('[MSW] Error: intercepted a request');
	} finally {
		console.warn = warn;
		console.error = error;
		await real.stop(true);
	}
});

test('an unknown onUnhandledRequest strategy is refused by listen()', () => {
	const server = fetchServer();
	expect(() => server.listen({ onUnhandledRequest: 'nope' as never })).toThrow(
		'unknown strategy "nope"',
	);
	expect(globalThis.fetch).toBe(fetch);
});

test('a handler that calls passthrough() sends the request for real', async () => {
	const real = Bun.serve({ port: 0, fetch: () => new Response('real') });
	const server = fetchServer(
		http.get(`http://localhost:${real.port}/p`, () => passthrough()),
	);
	server.listen({ onUnhandledRequest: 'error' });
	try {
		expect(await (await fetch(`http://localhost:${real.port}/p`)).text()).toBe(
			'real',
		);
	} finally {
		server.close();
		await real.stop(true);
	}
});

test('events and boundary() throw an error saying why', () => {
	const server = fetchServer();
	expect(() => server.events).toThrow('not available under Bun with msw 3');
	expect(() => server.boundary((() => {}) as never)).toThrow(
		'not available under Bun with msw 3',
	);
	// Non-enumerable: spreading the server does not throw.
	expect(() => ({ ...server })).not.toThrow();
});

test('isMsw3Server tells msw 3’s server from msw 2’s by its readyState', () => {
	expect(isMsw3Server({ readyState: 0 })).toBe(true);
	expect(isMsw3Server({})).toBe(false);
});

test('the control channel (fail, override, reset) drives the server startMockServer starts', async () => {
	const url = 'http://unserved.invalid/graphql';
	const state = createMockState();
	const { server, control } = startMockServer(
		[
			graphqlEndpoint(
				url,
				createExecutor({
					schema,
					state,
					context: (r) => ({ token: bearerToken(r) }),
				}),
			),
		],
		{ onUnhandledRequest: 'error', state },
	);
	const post = (query: string, operationName?: string) =>
		fetch(url, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: 'Bearer t1',
			},
			body: JSON.stringify({ query, operationName }),
		});
	try {
		expect(await (await post('{ whoami }')).json()).toEqual({
			data: { whoami: 't1' },
		});
		control.fail(503);
		expect((await post('{ whoami }')).status).toBe(503);
		await control.reset();
		expect((await post('{ whoami }')).status).toBe(200);
		control.override({ operationName: 'W', data: { whoami: 'fixed' } });
		expect(await (await post('query W { whoami }', 'W')).json()).toEqual({
			data: { whoami: 'fixed' },
		});
		await control.reset();
		expect(await (await post('query W { whoami }', 'W')).json()).toEqual({
			data: { whoami: 't1' },
		});
	} finally {
		server.close();
	}
});

// Catches an I/O hang only: a microtask loop never yields to this timer.
const withTimeout = <T>(promise: Promise<T>, ms = 3000): Promise<T> =>
	Promise.race([
		promise,
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms),
		),
	]);

test('fetch(bypass(request)) in a resolver reaches the real server once', async () => {
	let hits = 0;
	let entries = 0;
	let accept: string | null = 'unset';
	const real = Bun.serve({
		port: 0,
		fetch: (request) => {
			hits++;
			accept = request.headers.get('accept');
			return Response.json({ n: 1 });
		},
	});
	const url = `http://localhost:${real.port}/b`;
	const server = fetchServer(
		http.get(url, async ({ request }) => {
			// A microtask loop cannot be timed out: fail on the second entry.
			if (++entries > 1)
				throw new Error('bypass(request) re-entered the handlers');
			const body = (await fetch(bypass(request)).then((r) => r.json())) as {
				n: number;
			};
			return HttpResponse.json({ ...body, patched: true });
		}),
	);
	server.listen({ onUnhandledRequest: 'error' });
	try {
		const response = await withTimeout(fetch(url));
		expect(await response.json()).toEqual({ n: 1, patched: true });
		expect(hits).toBe(1);
		// A plain fetch(url) has no accept: the marker must not reach the server.
		expect(accept ?? '').not.toContain('msw');
	} finally {
		server.close();
		await real.stop(true);
	}
});

test('a wrapper put on fetch after listen() is no longer answered by a closed server', async () => {
	const real = Bun.serve({ port: 0, fetch: () => new Response('real') });
	const url = `http://localhost:${real.port}/s`;
	const server = fetchServer(http.get(url, () => HttpResponse.text('mock')));
	const before = globalThis.fetch;
	server.listen({ onUnhandledRequest: 'bypass' });
	const patched = globalThis.fetch;
	let depth = 0;
	const wrapper = (async (input, init) => {
		if (++depth > 3)
			throw new Error('the wrapper re-entered itself through the patch');
		try {
			return await patched(input, init);
		} finally {
			depth--;
		}
	}) as typeof fetch;
	globalThis.fetch = wrapper;
	try {
		expect(await (await fetch(url)).text()).toBe('mock');
		server.close();
		// close() leaves the wrapper, but the closed patch must stop mocking.
		expect(globalThis.fetch).toBe(wrapper);
		expect(await (await withTimeout(fetch(url))).text()).toBe('real');
		// listening again must not capture the wrapper and loop through it.
		server.listen({ onUnhandledRequest: 'bypass' });
		expect(
			await (
				await withTimeout(fetch(`http://localhost:${real.port}/other`))
			).text(),
		).toBe('real');
		server.close();
	} finally {
		globalThis.fetch = before;
		await real.stop(true);
	}
});

test('Bun’s extra fetch options survive a Request input and a stream body', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'msw-unix-'));
	const unix = join(dir, 's.sock');
	const real = Bun.serve({
		unix,
		fetch: async (request) =>
			new Response(`${request.method}:${await request.text()}`),
	});
	const server = fetchServer(hello);
	server.listen({ onUnhandledRequest: 'bypass' });
	try {
		const get = await withTimeout(
			fetch(new Request('http://localhost/x'), { unix } as RequestInit),
		);
		expect(await get.text()).toBe('GET:');
		const post = await withTimeout(
			fetch(
				new Request('http://localhost/x', { method: 'POST', body: 'payload' }),
				{ unix } as RequestInit,
			),
		);
		expect(await post.text()).toBe('POST:payload');
		const streamed = await withTimeout(
			fetch('http://localhost/x', {
				unix,
				method: 'POST',
				body: new Blob(['streamed']).stream(),
				duplex: 'half',
			} as RequestInit),
		);
		expect(await streamed.text()).toBe('POST:streamed');
		const bypassed = await withTimeout(
			fetch(
				bypass(
					new Request('http://localhost/x', { method: 'POST', body: 'marked' }),
				),
				{ unix } as RequestInit,
			),
		);
		expect(await bypassed.text()).toBe('POST:marked');
	} finally {
		server.close();
		await real.stop(true);
		rmSync(dir, { recursive: true, force: true });
	}
});

test('restoreHandlers does not add isUsed to a handler that has none', () => {
	const plain = {};
	const store = createHandlerStore([plain]);
	store.restoreHandlers();
	expect('isUsed' in plain).toBe(false);
});

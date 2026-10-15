import { expect, test } from 'bun:test';
import { getResponse, HttpResponse, http, passthrough } from 'msw';
import { schema } from '../../test/schema';
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
// startMockServer builds a network on the `fetch/web` interceptor. On msw 2 the
// same assertions hold through `setupServer`, which does intercept Bun's fetch.
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

test('a function onUnhandledRequest gets the request and msw’s print helpers', async () => {
	const real = Bun.serve({ port: 0, fetch: () => new Response('real') });
	const seen: string[] = [];
	const server = fetchServer();
	server.listen({
		onUnhandledRequest: (request) => {
			seen.push(`${request.method} ${new URL(request.url).pathname}`);
		},
	});
	try {
		expect(await (await fetch(`http://localhost:${real.port}/e`)).text()).toBe(
			'real',
		);
		expect(seen).toEqual(['GET /e']);
	} finally {
		server.close();
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

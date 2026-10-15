import { expect, test } from 'bun:test';
import { getResponse, HttpResponse, http } from 'msw';
import { startMockServer } from './index';
import { assertWebServerModules } from './web-server';

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

test('assertWebServerModules names the missing pieces and the msw version', () => {
	const node = { defaultNetworkOptions: {}, AsyncHandlersController: class {} };
	const experimental = {
		defineNetwork: () => ({}),
		InterceptorSource: class {},
	};
	const fetchWeb = { FetchInterceptor: class {} };
	expect(() =>
		assertWebServerModules(
			'3.0.3',
			node as never,
			experimental as never,
			fetchWeb,
		),
	).not.toThrow();
	expect(() => assertWebServerModules('3.9.0', node as never, {}, {})).toThrow(
		'@nxgt/msw-graphql cannot mock fetch under Bun with msw 3.9.0: defineNetwork, InterceptorSource, FetchInterceptor not found.',
	);
});

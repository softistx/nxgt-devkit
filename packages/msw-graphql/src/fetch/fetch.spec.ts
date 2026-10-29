import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bypass, HttpResponse, http, passthrough } from 'msw';
import { schema } from '../../test/schema';
import { bearerToken, createExecutor, graphqlEndpoint } from '../index';
import { withScope } from '../scope';
import { createMockState } from '../state';
import { createMockFetch } from './index';

const url = 'http://api.test/graphql';

function setup(options: Parameters<typeof createMockFetch>[1] = {}) {
	const state = createMockState();
	const handlers = [
		graphqlEndpoint(
			url,
			createExecutor({
				schema,
				state,
				context: (r) => ({ token: bearerToken(r) }),
			}),
		),
	];
	return createMockFetch(handlers, { state, ...options });
}

const query = (fetch: typeof globalThis.fetch, q: string, token = 't1') =>
	fetch(url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ query: q }),
	});

test('answers through the handlers, with no global patch', async () => {
	const before = globalThis.fetch;
	const { fetch } = setup();
	const response = await query(fetch, '{ whoami }');
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ data: { whoami: 't1' } });
	expect(globalThis.fetch).toBe(before);
});

test('accepts a Request as input', async () => {
	const { fetch } = setup();
	const request = new Request(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ query: '{ students { id } }' }),
	});
	expect((await fetch(request)).status).toBe(200);
});

test('an unhandled request goes to the fallback', async () => {
	const seen: string[] = [];
	const { fetch } = setup({
		fallback: (async (input: RequestInfo | URL) => {
			seen.push(new Request(input).url);
			return new Response('real');
		}) as typeof globalThis.fetch,
	});
	const response = await fetch('http://elsewhere.test/x');
	expect(await response.text()).toBe('real');
	expect(seen).toEqual(['http://elsewhere.test/x']);
});

test('strict throws on an unhandled request', async () => {
	const { fetch } = setup({ strict: true });
	await expect(fetch('http://elsewhere.test/x')).rejects.toThrow(
		'no handler for GET http://elsewhere.test/x',
	);
});

test('the control fails, overrides and resets the same fetch', async () => {
	let resets = 0;
	const { fetch, control } = setup({ reset: () => void resets++ });

	control.fail(503);
	expect((await query(fetch, '{ whoami }')).status).toBe(503);

	await control.reset();
	expect(resets).toBe(1);
	expect((await query(fetch, '{ whoami }')).status).toBe(200);

	control.override({ operationName: 'W', data: { whoami: 'fixed' } });
	const overridden = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ query: 'query W { whoami }', operationName: 'W' }),
	});
	expect(await overridden.json()).toEqual({ data: { whoami: 'fixed' } });

	await control.reset();
	expect(await (await query(fetch, 'query W { whoami }')).json()).toEqual({
		data: { whoami: 't1' },
	});
});

test('server.use puts a handler in front until resetHandlers', async () => {
	const { fetch, server } = setup();
	server.use(
		http.post(url, () => HttpResponse.json({ data: { whoami: 'used' } })),
	);
	expect(await (await query(fetch, '{ whoami }')).json()).toEqual({
		data: { whoami: 'used' },
	});
	server.resetHandlers();
	expect(await (await query(fetch, '{ whoami }')).json()).toEqual({
		data: { whoami: 't1' },
	});
});

test('the handler reads the body of a Request input', async () => {
	const { fetch, server } = setup();
	server.use(
		http.post('http://echo.test/', async ({ request }) =>
			HttpResponse.text(await request.text()),
		),
	);
	const request = new Request('http://echo.test/', {
		method: 'POST',
		body: 'hi',
	});
	expect(await (await fetch(request)).text()).toBe('hi');
	expect(server.listHandlers()).toHaveLength(2);
});

test('the fallback gets the request with its body unread', async () => {
	let seen: Request | undefined;
	const { fetch } = setup({
		fallback: (async (input: RequestInfo | URL) => {
			seen = input as Request;
			return new Response(await seen.text());
		}) as typeof globalThis.fetch,
	});
	const response = await fetch('http://b.test/y', {
		method: 'POST',
		body: 'payload',
	});
	expect(seen).toBeInstanceOf(Request);
	expect(await response.text()).toBe('payload');
});

test('an aborted signal rejects, as the real fetch does', async () => {
	const { fetch } = setup();
	await expect(
		fetch(url, { method: 'POST', signal: AbortSignal.abort() }),
	).rejects.toThrow();
});

test('a handler that calls passthrough() goes to the fallback, even with strict', async () => {
	const mock = createMockFetch(
		[http.get('http://p.test/x', () => passthrough())],
		{
			strict: true,
			fallback: (async (_input: RequestInfo | URL) =>
				new Response('real')) as typeof globalThis.fetch,
		},
	);
	expect(await (await mock.fetch('http://p.test/x')).text()).toBe('real');
});

test('fetch(bypass(request)) in a resolver reaches the fallback once', async () => {
	let hits = 0;
	let entries = 0;
	let accept: string | null = 'unset';
	const fallback = (async (input: RequestInfo | URL) => {
		hits++;
		accept = (input as Request).headers.get('accept');
		return Response.json({ n: 1 });
	}) as unknown as typeof fetch;
	const { fetch } = createMockFetch(
		[
			http.get('http://b.test/x', async ({ request }) => {
				// A microtask loop cannot be timed out: fail on the second entry.
				if (++entries > 1)
					throw new Error('bypass(request) re-entered the handlers');
				const body = (await globalThis
					.fetch(bypass(request))
					.then((r) => r.json())) as object;
				return HttpResponse.json({ ...body, patched: true });
			}),
		],
		{ fallback, strict: true },
	);
	// The resolver's own fetch is the global one: route it through the mock.
	const before = globalThis.fetch;
	globalThis.fetch = fetch;
	try {
		const response = await Promise.race([
			fetch('http://b.test/x'),
			new Promise<never>((_, r) =>
				setTimeout(() => r(new Error('timeout')), 3000),
			),
		]);
		expect(await response.json()).toEqual({ n: 1, patched: true });
		expect(hits).toBe(1);
		// A plain fetch(url) has no accept: the marker must not reach the fallback.
		expect(accept ?? '').not.toContain('msw');
	} finally {
		globalThis.fetch = before;
	}
});

test('Bun’s extra options reach the fallback of a bypass and of an unhandled request', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'msw-unix-'));
	const unix = join(dir, 's.sock');
	const real = Bun.serve({
		unix,
		fetch: async (request) => new Response(`${request.method}:${request.url}`),
	});
	const { fetch } = createMockFetch([], { fallback: globalThis.fetch });
	try {
		const unhandled = await fetch('http://localhost/u', {
			unix,
		} as RequestInit);
		expect(await unhandled.text()).toBe('GET:http://localhost/u');
		const bypassed = await fetch(bypass(new Request('http://localhost/b')), {
			unix,
		} as RequestInit);
		expect(await bypassed.text()).toBe('GET:http://localhost/b');
	} finally {
		await real.stop(true);
		rmSync(dir, { recursive: true, force: true });
	}
});

test('mock scopes: withScope reaches the handlers of concurrent calls', async () => {
	const { fetch, control } = setup();
	control.scope('1').fail(503);
	control.scope('2').override({ operationName: 'W', data: { whoami: 'two' } });
	const ask = (scope: string) =>
		withScope(scope, async () => {
			await new Promise((resolve) => setTimeout(resolve, 1));
			return query(fetch, 'query W { whoami }');
		});
	const [one, two, none] = await Promise.all([
		ask('1'),
		ask('2'),
		query(fetch, 'query W { whoami }'),
	]);
	expect(one.status).toBe(503);
	expect(await two.json()).toEqual({ data: { whoami: 'two' } });
	expect(none.status).toBe(200);
	expect((await none.json()).data.whoami).toBe('t1');
});

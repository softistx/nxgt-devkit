import { expect, test } from 'bun:test';
import { bypass, HttpResponse, http, passthrough } from 'msw';
import { schema } from '../../test/schema';
import { bearerToken, createExecutor, graphqlEndpoint } from '../index';
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
	const fallback = (async () => {
		hits++;
		return Response.json({ n: 1 });
	}) as unknown as typeof fetch;
	const { fetch } = createMockFetch(
		[
			http.get('http://b.test/x', async ({ request }) => {
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
	} finally {
		globalThis.fetch = before;
	}
});

import { expect, test } from 'bun:test';
import { getResponse, HttpResponse, http } from 'msw';
import { startMockServer } from './index';

// Bun logs msw 3's failure to patch node:net here; the server is still built.
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

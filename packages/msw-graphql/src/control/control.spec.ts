import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { getResponse } from 'msw';
import { post, schema } from '../../test/schema';
import { bearerToken, createExecutor, graphqlEndpoint } from '../index';
import { createMockState } from '../state';
import { createMockControl } from './index';

// A fake msw server over a handler list: use() prepends, resetHandlers() restores.
function fakeServer(initial: any[]) {
	let list = [...initial];
	return {
		use: (...h: any[]) => {
			list = [...h, ...list];
		},
		resetHandlers: () => {
			list = [...initial];
		},
		answer: async (body: unknown) =>
			(await getResponse(list, post(body))) as Response,
	};
}

const state = createMockState();
let resets = 0;
const removed: unknown[] = [];
function setup() {
	const server = fakeServer([
		graphqlEndpoint(
			'http://api.test/graphql',
			createExecutor({
				schema,
				state,
				context: (r) => ({ token: bearerToken(r) }),
			}),
		),
	]);
	const control = createMockControl({
		server,
		state,
		reset: () => {
			resets++;
		},
		scenarios: {
			remove: (args: unknown) => {
				removed.push(args);
			},
			empty: () => {},
		},
	});
	return { server, control };
}
const ask = (
	server: ReturnType<typeof fakeServer>,
	query = '{ whoami }',
	operationName?: string,
) => server.answer({ query, operationName });
const http = (path: string, body?: unknown, method = 'POST') =>
	new Request(`http://app.test/__mocks/${path}`, {
		method,
		body: body === undefined ? undefined : JSON.stringify(body),
	});

describe('programmatic', () => {
	beforeEach(() => {
		state.failing = null;
		resets = 0;
		removed.length = 0;
	});

	test('fail() is seen by the executor, reset() clears it and calls the app reset', async () => {
		const { server, control } = setup();
		control.fail(503);
		expect(control.failing).toBe(503);
		expect((await ask(server))?.status).toBe(503);
		await control.reset();
		expect(resets).toBe(1);
		expect((await ask(server))?.status).toBe(200);
	});

	test('override answers one operation, reset removes it', async () => {
		const { server, control } = setup();
		control.override({
			operationName: 'GetWho',
			errors: [{ message: 'forbidden', extensions: { http: { status: 403 } } }],
		});
		const forced = await ask(server, 'query GetWho { whoami }', 'GetWho');
		expect(forced?.status).toBe(403);
		expect((await forced.json()).errors[0].message).toBe('forbidden');
		// another operation is untouched
		expect((await ask(server, 'query Other { whoami }', 'Other'))?.status).toBe(
			200,
		);
		// the name is read from the query when the client sends none
		expect((await ask(server, 'query GetWho { whoami }'))?.status).toBe(403);
		await control.reset();
		expect(
			(await ask(server, 'query GetWho { whoami }', 'GetWho'))?.status,
		).toBe(200);
	});

	test('override with data and once', async () => {
		const { server, control } = setup();
		control.override({
			operationName: 'GetWho',
			data: { whoami: 'fixed' },
			once: true,
		});
		expect(
			await (await ask(server, 'query GetWho { whoami }', 'GetWho')).json(),
		).toEqual({ data: { whoami: 'fixed' } });
		const second = await (
			await ask(server, 'query GetWho { whoami }', 'GetWho')
		).json();
		expect(second.data.whoami).toBeNull();
	});

	test('failing wins over an override', async () => {
		const { server, control } = setup();
		control.override({ operationName: 'GetWho', data: { whoami: 'fixed' } });
		control.fail(500);
		expect(
			(await ask(server, 'query GetWho { whoami }', 'GetWho'))?.status,
		).toBe(500);
	});

	test('scenario passes its arguments; an unknown name throws', async () => {
		const { control } = setup();
		await control.scenario('remove', { id: 7 });
		expect(removed).toEqual([{ id: 7 }]);
		await expect(control.scenario('nope')).rejects.toThrow(
			'No scenario "nope"',
		);
	});
});

describe('handle', () => {
	beforeEach(() => {
		state.failing = null;
		resets = 0;
		removed.length = 0;
	});

	test('null for a path that is not the control', async () => {
		const { control } = setup();
		expect(
			await control.handle(new Request('http://app.test/students')),
		).toBeNull();
		expect(
			await control.handle(new Request('http://app.test/__mocksX/reset')),
		).toBeNull();
	});

	test('reset, fail, scenario, override over HTTP', async () => {
		const { server, control } = setup();
		expect((await control.handle(http('fail', { status: 503 })))?.status).toBe(
			200,
		);
		expect((await ask(server))?.status).toBe(503);
		await control.handle(http('fail', { status: null }));
		expect((await ask(server))?.status).toBe(200);
		await control.handle(http('scenario', { name: 'remove', args: { id: 1 } }));
		expect(removed).toEqual([{ id: 1 }]);
		await control.handle(
			http('override', {
				operationName: 'GetWho',
				status: 418,
				errors: [{ message: 't' }],
			}),
		);
		expect(
			(await ask(server, 'query GetWho { whoami }', 'GetWho'))?.status,
		).toBe(418);
		const reset = await control.handle(http('reset', {}));
		expect(await reset?.json()).toEqual({ ok: true });
		expect(resets).toBe(1);
		expect(
			(await ask(server, 'query GetWho { whoami }', 'GetWho'))?.status,
		).toBe(200);
	});

	test('bad input is a 400, an unknown scenario a 404, a GET a 405, an unknown route a 404', async () => {
		const { control } = setup();
		expect((await control.handle(http('fail', { status: 'x' })))?.status).toBe(
			400,
		);
		expect((await control.handle(http('fail', { status: 42 })))?.status).toBe(
			400,
		);
		expect((await control.handle(http('scenario', {})))?.status).toBe(400);
		expect((await control.handle(http('override', {})))?.status).toBe(400);
		expect(
			(
				await control.handle(
					new Request('http://app.test/__mocks/fail', {
						method: 'POST',
						body: 'x',
					}),
				)
			)?.status,
		).toBe(400);
		expect(
			(await control.handle(http('scenario', { name: 'nope' })))?.status,
		).toBe(404);
		expect(
			(await control.handle(http('reset', undefined, 'GET')))?.status,
		).toBe(405);
		expect((await control.handle(http('other', {})))?.status).toBe(404);
	});
});

describe('production guard', () => {
	const before = process.env.NODE_ENV;
	afterEach(() => {
		process.env.NODE_ENV = before;
	});

	test('createMockControl throws', () => {
		process.env.NODE_ENV = 'production';
		expect(() => setup()).toThrow('NODE_ENV is "production"');
	});

	test('handle answers 404 if NODE_ENV turns production later', async () => {
		const { control } = setup();
		process.env.NODE_ENV = 'production';
		expect((await control.handle(http('reset', {})))?.status).toBe(404);
		expect(await control.handle(new Request('http://app.test/x'))).toBeNull();
	});
});

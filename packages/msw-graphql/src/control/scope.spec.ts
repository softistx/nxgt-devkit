import { beforeEach, describe, expect, test } from 'bun:test';
import { getResponse } from 'msw';
import { post, schema } from '../../test/schema';
import { createExecutor, graphqlEndpoint } from '../index';
import {
	currentScope,
	SCOPE_HEADER,
	scopeOf,
	scopeOfCall,
	withScope,
} from '../scope';
import { createMockState } from '../state';
import { createMockControl } from './index';

function fakeServer(initial: any[]) {
	let list = [...initial];
	return {
		use: (...h: any[]) => {
			list = [...h, ...list];
		},
		resetHandlers: () => {
			list = [...initial];
		},
		get size() {
			return list.length;
		},
		answer: async (body: unknown, scope?: string) => {
			const request = post(body);
			if (scope) request.headers.set(SCOPE_HEADER, scope);
			return (await getResponse(list, request)) as Response;
		},
	};
}

const state = createMockState();
const seen: unknown[] = [];
function setup() {
	const server = fakeServer([
		graphqlEndpoint(
			'http://api.test/graphql',
			createExecutor({ schema, state }),
		),
	]);
	const control = createMockControl({
		server,
		state,
		reset: (context) => {
			seen.push(['reset', context]);
		},
		scenarios: {
			remove: (args: unknown, context) => {
				seen.push(['remove', args, context]);
			},
		},
	});
	return { server, control };
}
const who = (
	server: ReturnType<typeof fakeServer>,
	scope?: string,
	query = 'query GetWho { whoami }',
) => server.answer({ query, operationName: 'GetWho' }, scope);

beforeEach(() => {
	state.failing = null;
	state.scopes.clear();
	state.streams.clear();
	seen.length = 0;
});

describe('scope helpers', () => {
	test('scopeOf reads a valid header only', () => {
		const at = (value?: string) =>
			scopeOf(
				new Request('http://a.test', {
					headers: value === undefined ? {} : { [SCOPE_HEADER]: value },
				}),
			);
		expect(at('3')).toBe('3');
		expect(at()).toBeUndefined();
		expect(at('')).toBeUndefined();
		expect(at('a b')).toBeUndefined();
		expect(at('x'.repeat(65))).toBeUndefined();
	});

	test('withScope sets the scope across awaits, and undefined sets none', async () => {
		expect(currentScope()).toBeUndefined();
		const inside = await withScope('7', async () => {
			await new Promise((r) => setTimeout(r, 1));
			return currentScope();
		});
		expect(inside).toBe('7');
		expect(withScope(undefined, () => currentScope())).toBeUndefined();
		expect(currentScope()).toBeUndefined();
	});
});

describe('a scoped control', () => {
	test('fail() acts on its scope only', async () => {
		const { server, control } = setup();
		control.scope('1').fail(503);
		expect(control.scope('1').failing).toBe(503);
		expect(control.failing).toBeNull();
		expect((await who(server, '1')).status).toBe(503);
		expect((await who(server, '2')).status).toBe(200);
		expect((await who(server)).status).toBe(200);
	});

	test('the scope comes from withScope as well as from the header', async () => {
		const { server, control } = setup();
		control.scope('1').fail(502);
		expect((await withScope('1', () => who(server))).status).toBe(502);
		expect((await withScope('2', () => who(server))).status).toBe(200);
	});

	test('a global failure reaches every scope', async () => {
		const { server, control } = setup();
		control.fail(500);
		expect((await who(server, '1')).status).toBe(500);
	});

	test('overrides match their scope only, and a scoped reset keeps the others', async () => {
		const { server, control } = setup();
		control
			.scope('1')
			.override({ operationName: 'GetWho', data: { whoami: 'one' } });
		control
			.scope('2')
			.override({ operationName: 'GetWho', data: { whoami: 'two' } });
		expect(await (await who(server, '1')).json()).toEqual({
			data: { whoami: 'one' },
		});
		expect(await (await who(server, '2')).json()).toEqual({
			data: { whoami: 'two' },
		});
		expect((await (await who(server)).json()).data.whoami).not.toBe('one');

		control.scope('1').fail(503);
		await control.scope('1').reset();
		expect(control.scope('1').failing).toBeNull();
		expect((await (await who(server, '1')).json()).data.whoami).not.toBe('one');
		expect(await (await who(server, '2')).json()).toEqual({
			data: { whoami: 'two' },
		});
		expect(seen).toEqual([['reset', { scope: '1' }]]);
	});

	test('one handler per scope, the latest override first, once spent per override', async () => {
		const { server, control } = setup();
		const before = server.size;
		const one = control.scope('1');
		one.override({ operationName: 'GetWho', data: { whoami: 'a' } });
		one.override({
			operationName: 'GetWho',
			data: { whoami: 'b' },
			once: true,
		});
		await one.reset();
		one.override({ operationName: 'GetWho', data: { whoami: 'a' } });
		one.override({
			operationName: 'GetWho',
			data: { whoami: 'b' },
			once: true,
		});
		expect(server.size).toBe(before + 1);
		expect((await (await who(server, '1')).json()).data.whoami).toBe('b');
		expect((await (await who(server, '1')).json()).data.whoami).toBe('a');
	});

	test('an unscoped reset clears every scope, and a scope can override again', async () => {
		const { server, control } = setup();
		control
			.scope('1')
			.override({ operationName: 'GetWho', data: { whoami: 'one' } });
		control.scope('1').fail(503);
		await control.reset();
		expect(state.scopes.size).toBe(0);
		expect((await (await who(server, '1')).json()).data.whoami).not.toBe('one');
		control
			.scope('1')
			.override({ operationName: 'GetWho', data: { whoami: 'again' } });
		expect((await (await who(server, '1')).json()).data.whoami).toBe('again');
		expect(seen).toEqual([['reset', undefined]]);
	});

	test('scenarios get the scope as their second argument, unscoped ones nothing', async () => {
		const { control } = setup();
		await control.scenario('remove', { id: 1 });
		await control.scope('4').scenario('remove', { id: 2 });
		expect(seen).toEqual([
			['remove', { id: 1 }, undefined],
			['remove', { id: 2 }, { scope: '4' }],
		]);
	});

	test('an invalid scope is a TypeError', () => {
		const { control } = setup();
		expect(() => control.scope('')).toThrow(TypeError);
		expect(() => control.scope('a/b')).toThrow(TypeError);
	});
});

describe('over HTTP', () => {
	const http = (route: string, body: unknown, scope?: string) =>
		new Request(`http://app.test/__mocks/${route}`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				...(scope === undefined ? {} : { [SCOPE_HEADER]: scope }),
			},
			body: JSON.stringify(body),
		});

	test('the header scopes fail, override, scenario and reset', async () => {
		const { server, control } = setup();
		await control.handle(http('fail', { status: 503 }, '1'));
		expect(control.failing).toBeNull();
		expect(control.scope('1').failing).toBe(503);
		await control.handle(
			http('override', { operationName: 'GetWho', data: { whoami: 'x' } }, '2'),
		);
		expect((await (await who(server, '2')).json()).data).toEqual({
			whoami: 'x',
		});
		await control.handle(http('scenario', { name: 'remove', args: 1 }, '2'));
		await control.handle(http('reset', {}, '1'));
		expect(control.scope('1').failing).toBeNull();
		expect(seen).toEqual([
			['remove', 1, { scope: '2' }],
			['reset', { scope: '1' }],
		]);
	});

	test('without the header it is the global control, unchanged', async () => {
		const { control } = setup();
		await control.handle(http('fail', { status: 503 }));
		expect(control.failing).toBe(503);
		await control.handle(http('reset', {}));
		expect(control.failing).toBeNull();
		expect(seen).toEqual([['reset', undefined]]);
	});

	test('an invalid scope header is a 400, not a global reset', async () => {
		const { control } = setup();
		control.fail(503);
		const response = await control.handle(http('reset', {}, 'a b'));
		expect(response?.status).toBe(400);
		expect(control.failing).toBe(503);
	});
});

describe('withScope nesting', () => {
	test('undefined inside an outer scope keeps the outer scope', () => {
		withScope('outer', () => {
			withScope(undefined, () => expect(currentScope()).toBe('outer'));
			withScope('inner', () => expect(currentScope()).toBe('inner'));
			expect(currentScope()).toBe('outer');
		});
	});

	test('the current scope wins over the request header', () => {
		const request = post({});
		request.headers.set(SCOPE_HEADER, 'header');
		expect(scopeOfCall(request)).toBe('header');
		withScope('current', () => expect(scopeOfCall(request)).toBe('current'));
	});
});

import { expect, test } from 'bun:test';
import { getResponse } from 'msw';
import { schema } from '../test/schema';
import { graphqlEndpoint } from './endpoint';
import { createExecutor } from './executor';
import { createMockState } from './state';

// `getResponse` runs the handler without intercepting anything: msw 3's Node
// interceptors do not see Bun's native fetch, so interception is checked in
// Node by scripts/node-smoke.mjs.
const state = createMockState();
const handlers = [
	graphqlEndpoint('http://api.test/graphql', createExecutor({ schema, state })),
];

const call = (body: BodyInit) =>
	getResponse(
		handlers,
		new Request('http://api.test/graphql', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body,
		}),
	);

test('answers a GraphQL POST', async () => {
	const response = await call(
		JSON.stringify({
			query: 'query Q($id: ID!) { student(id: $id) { name } }',
			variables: { id: '1' },
			operationName: 'Q',
		}),
	);
	expect(response?.status).toBe(200);
	expect(await response?.json()).toEqual({
		data: { student: { name: 'Ada' } },
	});
});

test('a body that is not an operation is a 400', async () => {
	expect((await call('nope'))?.status).toBe(400);
	expect((await call('{"variables":{}}'))?.status).toBe(400);
});

test('another URL is not handled', async () => {
	const response = await getResponse(
		handlers,
		new Request('http://other.test/graphql', { method: 'POST', body: '{}' }),
	);
	expect(response).toBeUndefined();
});

test('the executor sees the shared failing state', async () => {
	state.failing = 503;
	expect((await call(JSON.stringify({ query: '{ whoami }' })))?.status).toBe(
		503,
	);
	state.failing = null;
});

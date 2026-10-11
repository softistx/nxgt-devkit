// Runs the built package against a real msw Node server, in Node.
//
// msw 3's interceptors patch `node:net`, which Bun's native fetch never
// touches, so a Bun spec cannot see an msw server intercept anything: this is
// the one place the interception itself is exercised. It imports `dist/`, so
// it also proves the built subpaths load. Build first.
import assert from 'node:assert/strict';
import { http } from 'msw';
import { createMockFetch } from '../dist/fetch/index.js';
import {
	createExecutor,
	GraphQLHttpError,
	graphqlEndpoint,
} from '../dist/index.js';
import { startMockServer } from '../dist/node/index.js';
import { ok } from '../dist/response/index.js';
import { buildMockSchema } from '../dist/schema/index.js';

const schema = buildMockSchema({
	typeDefs: 'type Query { hello: String, boom: String }',
	resolvers: {
		Query: {
			hello: () => 'world',
			boom: () => {
				throw new GraphQLHttpError('teapot', 418);
			},
		},
	},
});

const { server, control } = startMockServer(
	[
		graphqlEndpoint('http://api.test/graphql', createExecutor({ schema })),
		http.get('http://api.test/rest', () => ok({ rest: true })),
	],
	{ onUnhandledRequest: 'error' },
);

const call = (query) =>
	fetch('http://api.test/graphql', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ query }),
	});

try {
	const ok = await call('{ hello }');
	assert.equal(ok.status, 200);
	assert.deepEqual(await ok.json(), { data: { hello: 'world' } });

	const teapot = await call('{ boom }');
	assert.equal(teapot.status, 418);

	const invalid = await call('{ nope }');
	assert.equal(invalid.status, 400);
	const rest = await fetch('http://api.test/rest');
	assert.deepEqual(await rest.json(), { rest: true });

	// The control channel, over a real server: fail, override, scenario, reset.
	const reply = (path, body) =>
		control.handle(
			new Request(`http://app.test/__mocks/${path}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body),
			}),
		);
	assert.equal((await reply('fail', { status: 503 })).status, 200);
	assert.equal((await call('{ hello }')).status, 503);
	assert.equal((await reply('reset', {})).status, 200);
	assert.equal((await call('{ hello }')).status, 200);
	await reply('override', {
		operationName: 'Hi',
		status: 403,
		errors: [{ message: 'no' }],
	});
	const forced = await fetch('http://api.test/graphql', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ query: 'query Hi { hello }', operationName: 'Hi' }),
	});
	assert.equal(forced.status, 403);
	await control.reset();
	assert.equal((await call('query Hi { hello }')).status, 200);

	// onUnhandledRequest 'error' is honoured by both msw majors.
	await assert.rejects(fetch('http://api.test/unhandled'));
} finally {
	server.close();
}

// The built /fetch: no interception at all, so it answers the same anywhere.
{
	const { fetch: mockFetch, control: fetchControl } = createMockFetch(
		[graphqlEndpoint('http://api.test/graphql', createExecutor({ schema }))],
		{ strict: true },
	);
	const answered = await mockFetch('http://api.test/graphql', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ query: '{ hello }' }),
	});
	assert.deepEqual(await answered.json(), { data: { hello: 'world' } });
	fetchControl.fail(503);
	assert.equal(
		(
			await mockFetch('http://api.test/graphql', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ query: '{ hello }' }),
			})
		).status,
		503,
	);
	await fetchControl.reset();
	await assert.rejects(mockFetch('http://api.test/unhandled'));
}
console.log('node smoke: ok');

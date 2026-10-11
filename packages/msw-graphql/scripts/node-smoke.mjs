// Runs the built package against a real msw Node server, in Node.
//
// msw 3's interceptors patch `node:net`, which Bun's native fetch never
// touches, so a Bun spec cannot see an msw server intercept anything: this is
// the one place the interception itself is exercised. It imports `dist/`, so
// it also proves the built subpaths load. Build first.
import assert from 'node:assert/strict';
import { http } from 'msw';
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

const { server } = startMockServer(
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

	// onUnhandledRequest 'error' is honoured by both msw majors.
	await assert.rejects(fetch('http://api.test/unhandled'));
	console.log('node smoke: ok');
} finally {
	server.close();
}

import { describe, expect, test } from 'bun:test';
import { post, schema } from '../test/schema';
import { bearerToken } from './bearer';
import { GraphQLHttpError } from './errors';
import { createExecutor } from './executor';
import { createMockState } from './state';

function setup(state = createMockState()) {
	const execute = createExecutor<{ token: string | null }>({
		schema,
		state,
		context: (request) => ({ token: bearerToken(request) }),
		guard: (request) =>
			request.headers.get('x-client') === 'bad'
				? new GraphQLHttpError('client-refused', 403)
				: null,
	});
	const run = async (
		query: string,
		extra: {
			variables?: Record<string, unknown>;
			operationName?: string;
			headers?: Record<string, string>;
		} = {},
	) => {
		const request = post({ query }, extra.headers);
		const response = await execute({
			query,
			variables: extra.variables,
			operationName: extra.operationName,
			request,
		});
		return {
			status: response.status,
			body: response.status === 503 ? null : await response.json(),
		};
	};
	return { run, state };
}

describe('createExecutor', () => {
	test('executes a query: resolvers win, the rest is generated', async () => {
		const { run } = setup();
		const { status, body } = await run(
			'query ($id: ID!) { student(id: $id) { id name born grade } }',
			{ variables: { id: '7' } },
		);
		expect(status).toBe(200);
		expect(body.data.student).toMatchObject({
			id: '7',
			name: 'Ada',
			born: '2020-01-01',
		});
		expect(typeof body.data.student.grade).toBe('number');
	});

	test('the context is built from the request', async () => {
		const { run } = setup();
		const { body } = await run('{ whoami }', {
			headers: { authorization: 'Bearer abc' },
		});
		expect(body.data.whoami).toBe('abc');
	});

	test('a syntax error is a 400 with the error', async () => {
		const { run } = setup();
		const { status, body } = await run('{ students ');
		expect(status).toBe(400);
		expect(body.errors[0].message).toContain('Syntax Error');
		expect(body.data).toBeUndefined();
	});

	test('a validation error is a 400', async () => {
		const { run } = setup();
		const { status, body } = await run('{ nope }');
		expect(status).toBe(400);
		expect(body.errors[0].message).toContain('nope');
	});

	test('the status comes from the first error that names one', async () => {
		const { run } = setup();
		const missing = await run('{ student(id: "404") { id } }');
		expect(missing.status).toBe(404);
		expect(missing.body.errors[0].extensions).toEqual({
			code: 'not-found',
			http: { status: 404 },
		});
		const teapot = await run('{ boom }');
		expect(teapot.status).toBe(418);
		expect(teapot.body.errors[0].extensions.hint).toBe('tea');
	});

	test('an error without a status stays a 200', async () => {
		const { run } = setup();
		const { status, body } = await run('{ plain }');
		expect(body.errors.length).toBe(1);
		expect(status).toBe(200);
	});

	test('the guard answers before the operation is parsed', async () => {
		const { run } = setup();
		const { status, body } = await run('{ students ', {
			headers: { 'x-client': 'bad' },
		});
		expect(status).toBe(403);
		expect(body.errors[0].extensions.code).toBe('client-refused');
	});

	test('failing comes before the guard: 503 has no body, others an error', async () => {
		const { run, state } = setup();
		state.failing = 503;
		expect(
			(await run('{ whoami }', { headers: { 'x-client': 'bad' } })).status,
		).toBe(503);
		state.failing = 500;
		const failed = await run('{ whoami }');
		expect(failed.status).toBe(500);
		expect(failed.body.errors[0].extensions.code).toBe('INTERNAL_SERVER_ERROR');
		state.failing = null;
		expect((await run('{ whoami }')).status).toBe(200);
	});

	test('operationName picks the operation of a document', async () => {
		const { run } = setup();
		const { body } = await run(
			'query A { whoami } query B { students { id } }',
			{ operationName: 'B' },
		);
		expect(Array.isArray(body.data.students)).toBe(true);
	});
});

describe('bearerToken', () => {
	test('reads the token, else null', () => {
		expect(bearerToken(post({}, { authorization: 'Bearer t0k' }))).toBe('t0k');
		expect(bearerToken(post({}, { authorization: 'Basic x' }))).toBeNull();
		expect(bearerToken(post({}))).toBeNull();
	});
});

describe('GraphQLHttpError', () => {
	test('carries code, status and extra extensions', () => {
		const error = new GraphQLHttpError('x', 409, { fields: [] });
		expect(error.status).toBe(409);
		expect(error.toJSON().extensions).toEqual({
			code: 'x',
			http: { status: 409 },
			fields: [],
		});
	});
});

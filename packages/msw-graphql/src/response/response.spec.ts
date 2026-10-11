import { expect, test } from 'bun:test';
import {
	badRequest,
	created,
	forbidden,
	graphqlErrors,
	noContent,
	notFound,
	ok,
	unauthorized,
} from './index';

test('ok and created carry a JSON body and their status', async () => {
	expect(ok({ a: 1 }).status).toBe(200);
	expect(await ok({ a: 1 }).json()).toEqual({ a: 1 });
	expect(created({ id: 2 }).status).toBe(201);
});

test('noContent is a 204 with no body', async () => {
	const response = noContent();
	expect(response.status).toBe(204);
	expect(await response.text()).toBe('');
});

test('the error helpers answer { timestamp, status, message }', async () => {
	for (const [make, status] of [
		[badRequest, 400],
		[unauthorized, 401],
		[forbidden, 403],
		[notFound, 404],
	] as const) {
		const response = make('nope');
		expect(response.status).toBe(status);
		expect(await response.json()).toMatchObject({ status, message: 'nope' });
	}
});

test('graphqlErrors answers { errors } with 200 unless told otherwise', async () => {
	const errors = [{ message: 'x', extensions: { code: 'C' } }];
	const plain = graphqlErrors(errors);
	expect(plain.status).toBe(200);
	expect(await plain.json()).toEqual({ errors });
	expect(graphqlErrors(errors, 403).status).toBe(403);
});

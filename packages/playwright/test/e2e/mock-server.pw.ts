import type { Override } from '@nxgt/msw-graphql/control';
import { type APIRequestContext, test as base, expect } from '@playwright/test';
import {
	createMockServerTest,
	type ServerOverride,
} from '../../src/mock-server';

// The contract between this subpath's copied wire types and
// `@nxgt/msw-graphql/control`: test/server.ts mounts the real control, this
// spec drives it through the fixture and reads the effect back from /__state.
const test = createMockServerTest(base);

// The copied wire type and the control's own must stay the same type: this
// line stops typechecking the day one of them changes alone.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export const sameOverride: Same<Override, ServerOverride> = true;

type State = {
	failing: number | null;
	resets: number;
	overrides: number;
	scenarios: unknown[];
};
const state = async (request: APIRequestContext) =>
	(await (await request.get('/__state')).json()) as State;

test.describe('mockServer', () => {
	test('fail, then the auto reset after the test', async ({
		mockServer,
		request,
	}) => {
		await mockServer.fail(503);
		expect((await state(request)).failing).toBe(503);
		await mockServer.fail(null);
		expect((await state(request)).failing).toBeNull();
		await mockServer.fail(500);
	});

	test('the previous test left nothing behind', async ({ request }) => {
		expect((await state(request)).failing).toBeNull();
	});

	test('scenario passes its arguments', async ({ mockServer, request }) => {
		await mockServer.scenario('remove', { id: 7 });
		await mockServer.scenario('empty');
		expect((await state(request)).scenarios).toEqual([
			{ name: 'remove', args: { id: 7 } },
			{ name: 'empty' },
		]);
	});

	test('use registers overrides, reset removes them', async ({
		mockServer,
		request,
	}) => {
		await mockServer.use(
			{ operationName: 'A', data: { a: 1 } },
			{ operationName: 'B', status: 403, errors: [{ message: 'no' }] },
		);
		expect((await state(request)).overrides).toBe(2);
		await mockServer.reset();
		expect((await state(request)).overrides).toBe(0);
	});

	test('an unknown scenario is said, with the route and status', async ({
		mockServer,
	}) => {
		await expect(mockServer.scenario('nope')).rejects.toThrow(
			/scenario answered 404.*No scenario/s,
		);
	});
});

test.describe('serverMocks', () => {
	test.use({
		serverMocks: [{ operationName: 'Seeded', data: { ok: true } }],
	});

	test('are applied before the test and cleared after', async ({ request }) => {
		expect((await state(request)).overrides).toBe(1);
	});
});

test('every test starts reset', async ({ request }) => {
	const now = await state(request);
	expect(now.overrides).toBe(0);
	expect(now.failing).toBeNull();
	expect(now.resets).toBeGreaterThan(0);
});

test.describe('the reset around a test', () => {
	test.describe.configure({ mode: 'serial' });
	let seen = 0;

	test('counts the resets it saw', async ({ request }) => {
		seen = (await state(request)).resets;
	});

	test('the next test finds one before it and one after the previous', async ({
		request,
	}) => {
		// previous test: its teardown reset (+1); this test: its setup reset (+1)
		expect((await state(request)).resets).toBe(seen + 2);
	});
});

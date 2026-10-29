import { test as base, expect } from '@playwright/test';
import { createMockServerTest } from '../../src/mock-server';

// Two workers share the one server; each test forces its own failing status
// and reads it back through the page and the request while the others run.
const test = createMockServerTest(base, { scope: true });
test.describe.configure({ mode: 'parallel' });

type Seen = { scope: string | null; failing: number | null };

for (const status of [501, 502, 503, 504, 505, 506]) {
	test(`worker-scoped failure ${status}`, async ({
		mockServer,
		page,
		request,
	}, testInfo) => {
		await mockServer.fail(status);
		for (let i = 0; i < 5; i++) {
			await page.waitForTimeout(50);
			await page.goto('/__scope');
			const seenByPage = JSON.parse(
				(await page.locator('body').innerText()) || '{}',
			) as Seen;
			expect(seenByPage).toEqual({
				scope: String(testInfo.workerIndex),
				failing: status,
			});
			const seenByRequest = (await (
				await request.get('/__scope')
			).json()) as Seen;
			expect(seenByRequest.failing).toBe(status);
		}
	});
}

test('a reset of one scope leaves the others untouched', async ({
	request,
}) => {
	// Explicit headers, so two scopes live in this one test.
	const as = (scope: string) => ({
		'content-type': 'application/json',
		'x-mock-scope': scope,
	});
	const control = (scope: string, route: string, data: unknown) =>
		request.post(`/__mocks/${route}`, { data, headers: as(scope) });
	const failingOf = async (scope: string) =>
		(
			(await (
				await request.get('/__scope', { headers: as(scope) })
			).json()) as Seen
		).failing;
	try {
		await control('isolation-a', 'fail', { status: 501 });
		await control('isolation-b', 'fail', { status: 502 });
		expect(await failingOf('isolation-a')).toBe(501);
		expect(await failingOf('isolation-b')).toBe(502);
		await control('isolation-a', 'reset', {});
		expect(await failingOf('isolation-a')).toBe(null);
		expect(await failingOf('isolation-b')).toBe(502);
	} finally {
		await control('isolation-a', 'reset', {});
		await control('isolation-b', 'reset', {});
	}
});

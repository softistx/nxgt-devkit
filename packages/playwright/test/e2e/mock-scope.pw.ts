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

test('a reset of one worker leaves the others untouched', async ({
	mockServer,
	request,
}) => {
	await mockServer.fail(500);
	await mockServer.reset();
	expect(((await (await request.get('/__scope')).json()) as Seen).failing).toBe(
		null,
	);
});

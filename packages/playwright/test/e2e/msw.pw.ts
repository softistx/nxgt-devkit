import { expect } from '@playwright/test';
import { HttpResponse, http } from 'msw';
import { createMswTest } from '../../src/msw';

let resets = 0;
const test = createMswTest(
	[http.get('*/api/greeting', () => HttpResponse.text('mocked'))],
	{ onReset: () => resets++ },
);

test('requests go through the default handlers', async ({ page }) => {
	await page.goto('/');
	await page.waitForTimeout(400);
	await page.getByTestId('name').fill('Ada');
	await page.getByTestId('submit').click();
	await expect(page.getByTestId('result')).toHaveText('mocked');
	expect(resets).toBeGreaterThan(0);
});

test('network.use adds a handler for one test', async ({ page, network }) => {
	network.use(http.get('*/api/greeting', () => HttpResponse.text('override')));
	await page.goto('/');
	await page.waitForTimeout(400);
	await page.getByTestId('name').fill('Ada');
	await page.getByTestId('submit').click();
	await expect(page.getByTestId('result')).toHaveText('override');
});

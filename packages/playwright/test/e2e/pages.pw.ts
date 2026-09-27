import { existsSync, rmSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { BasePage, FormPage } from '../../src/pages';

const DIR = '.probe-screenshots';

test.afterAll(() => rmSync(DIR, { recursive: true, force: true }));

test('BasePage: goto, title, and a screenshot named after the path', async ({
	page,
}) => {
	const login = new BasePage(page, '/login?next=/', { screenshotDir: DIR });
	await login.goto();
	await login.expectTitle(/Sign In/);
	await login.screenshot({ suffix: '01' });
	expect(existsSync(`${DIR}/login-01.png`)).toBe(true);
});

test('FormPage: submit clicks the test id', async ({ page }) => {
	const form = new FormPage(page, '/');
	await form.goto();
	await page.waitForTimeout(400);
	await page.getByTestId('name').fill('Ada');
	await form.submit();
	await expect(page.getByTestId('result')).toHaveText('server:Ada');
});

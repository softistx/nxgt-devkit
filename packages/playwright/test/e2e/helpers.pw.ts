import { expect, test } from '@playwright/test';
import { fillSettled, fillUntilEnabled } from '../../src/helpers';

test('a plain fill is lost to the reset; fillSettled survives it', async ({
	page,
}) => {
	await page.goto('/');
	const input = page.getByTestId('name');
	await fillSettled(input, 'Ada', { settle: 400 });
	await page.waitForTimeout(300);
	await expect(input).toHaveValue('Ada');
});

test('fillUntilEnabled retries until the submit is enabled', async ({
	page,
}) => {
	await page.goto('/');
	const submit = page.getByTestId('submit');
	await fillUntilEnabled([[page.getByTestId('name'), 'Ada']], submit);
	await page.waitForTimeout(300);
	await expect(submit).toBeEnabled();
});

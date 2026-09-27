import { test as base, expect } from '@playwright/test';
import { withLoginFixture } from '../../src/auth';
import { BasePage } from '../../src/pages';

class SignInPage extends BasePage {
	constructor(page: ConstructorParameters<typeof BasePage>[0]) {
		super(page, '/login');
	}
}

const test = withLoginFixture(base, SignInPage);

test('login is the sign-in page, already open', async ({ login, page }) => {
	expect(login).toBeInstanceOf(SignInPage);
	await expect(page).toHaveTitle(/Sign In/);
});

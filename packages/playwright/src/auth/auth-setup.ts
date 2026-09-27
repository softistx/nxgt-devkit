import type { Page, PlaywrightTestArgs, TestType } from '@playwright/test';
import { authFile, DEFAULT_AUTH_DIR } from './auth-file';

export type AuthSetupOptions<A> = {
	/** One storage state per entry: `{ user: USER, admin: ADMIN }`. */
	accounts: Record<string, A>;
	/** Signs `account` in on `page`. The page is blank when it is called. */
	signIn: (page: Page, account: A) => Promise<unknown>;
	/**
	 * Waited for after `signIn`, before the state is saved — a state saved
	 * before the redirect lands can miss the session cookie. Default `'/'`;
	 * `false` to skip.
	 */
	afterSignIn?: string | RegExp | false;
	/** Default `playwright/.auth`. */
	dir?: string;
};

/**
 * Declares one setup test per account, each saving `<dir>/<account>.json`.
 * Call it at the top level of the file your `setup` project matches:
 *
 * ```ts
 * // playwright/config/auth.setup.ts
 * authSetup(test, {
 * 	accounts: { user: USER, admin: ADMIN },
 * 	signIn: async (page, account) => {
 * 		const signIn = new SignInPage(page);
 * 		await signIn.goto();
 * 		await signIn.signIn(account);
 * 	},
 * });
 * ```
 *
 * and in a spec: `test.use({ storageState: authFile('user') })`.
 */
export function authSetup<T extends PlaywrightTestArgs, W extends object, A>(
	test: TestType<T, W>,
	{
		accounts,
		signIn,
		afterSignIn = '/',
		dir = DEFAULT_AUTH_DIR,
	}: AuthSetupOptions<A>,
): void {
	for (const [name, account] of Object.entries(accounts)) {
		test(`Authenticate as ${name}`, async ({ page }) => {
			await signIn(page, account);
			if (afterSignIn !== false) await page.waitForURL(afterSignIn);
			await page.context().storageState({ path: authFile(name, dir) });
		});
	}
}

import type {
	Fixtures,
	Page,
	PlaywrightTestArgs,
	TestType,
} from '@playwright/test';

/** A sign-in page object: constructed from a `Page`, with a `goto()`. */
export type LoginPageCtor<P extends { goto(): Promise<unknown> }> = new (
	page: Page,
) => P;

/**
 * Adds a `login` fixture: the app's sign-in page, already navigated to.
 *
 * ```ts
 * export const test = withLoginFixture(base, SignInPage);
 * test('signs in', async ({ login }) => { await login.signIn(USER); });
 * ```
 */
export function withLoginFixture<
	T extends PlaywrightTestArgs,
	W extends object,
	P extends { goto(): Promise<unknown> },
>(test: TestType<T, W>, LoginPage: LoginPageCtor<P>) {
	// Written out and cast once: TypeScript cannot resolve `Fixtures<…>`'s
	// mapped type while `T` is still generic, although it is exact for every
	// concrete `test` a caller passes.
	const fixtures = {
		login: async (
			{ page }: { page: Page },
			use: (login: P) => Promise<void>,
		) => {
			const login = new LoginPage(page);
			await login.goto();
			await use(login);
		},
	};
	return test.extend<{ login: P }>(
		fixtures as unknown as Fixtures<{ login: P }, object, T, W>,
	);
}

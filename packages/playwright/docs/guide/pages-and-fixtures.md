# Pages and fixtures

Page objects bound to one path (`BasePage`, `FormPage`), accounts signed in once
and reused as storage state (`authSetup`, `authFile`), and a `login` fixture
that hands a spec the sign-in page already open (`withLoginFixture`).

```ts
// playwright/pages/projects.page.ts
import type { Page } from '@playwright/test';
import { BasePage } from '@nxgt/playwright/pages';

export class ProjectsPage extends BasePage {
	constructor(page: Page) {
		super(page, '/projects');
	}
}
```

```ts
// playwright/e2e/projects.spec.ts
import { test } from '@playwright/test';
import { ProjectsPage } from '../pages/projects.page';

test('opens the projects page', async ({ page }) => {
	const projects = new ProjectsPage(page);
	await projects.goto();
	await projects.expectTitle(/Projects/);
	await projects.screenshot(); // playwright/screenshots/projects.png
});
```

Everything here is exported from `@nxgt/playwright/pages` and
`@nxgt/playwright/auth`, and again from the root `@nxgt/playwright`.

## `BasePage`

```ts
type BasePageOptions = {
	screenshotDir?: string; // default 'playwright/screenshots'
};

type PageScreenshotOptions = Parameters<Page['screenshot']>[0] & {
	suffix?: string;
};

class BasePage {
	readonly page: Page;
	readonly path: string;
	readonly screenshotDir: string;

	constructor(page: Page, path: string, options?: BasePageOptions);

	goto(): Promise<Response | null>; // page.goto(this.path)
	waitForTimeout(ms: number): Promise<void>;
	waitForURL(url: RegExp | string): Promise<void>;
	expectTitle(title: RegExp | string): Promise<void>; // expect(page).toHaveTitle
	screenshot(options?: PageScreenshotOptions): Promise<Buffer>;
}

const DEFAULT_SCREENSHOT_DIR = 'playwright/screenshots';
```

`path` is relative to the config's `baseURL`, and may carry a query:
`new BasePage(page, '/login?next=/')`.

### `screenshot()`

The file is `<screenshotDir>/<path as a slug>[-<suffix>].png`, named with
[`screenshotName`](helpers.md#screenshotname) — the query and hash are dropped,
`/` becomes `-`, the root is `index`.

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `suffix` | `string` | none | Appended to the name: `login-01.png`. |
| `path` | `string` | the page's `path` | Replaces the page path **in the name**; the directory stays `screenshotDir`. |
| any other | `PageScreenshotOptions` | Playwright's | Passed to `page.screenshot()` (`fullPage`, `mask`, `animations`, …). |

```ts
const login = new BasePage(page, '/login?next=/', { screenshotDir: 'docs/screens' });
await login.goto();
await login.screenshot({ suffix: '01' }); // docs/screens/login-01.png
await login.screenshot({ path: '/login/error', fullPage: true }); // docs/screens/login-error.png
```

## `FormPage`

A `BasePage` with a submit button found by test id.

```ts
type FormPageOptions = BasePageOptions & {
	submitTestId?: string; // default 'submit'
};

class FormPage extends BasePage {
	readonly submitButton: Locator; // page.getByTestId(submitTestId)
	constructor(page: Page, path: string, options?: FormPageOptions);
	submit(): Promise<void>; // submitButton.click()
}
```

The test id is read through the config's `testIdAttribute` (`data-pw` with
[`defineAppConfig`](config.md#testidattribute)), so the default matches
`<button data-pw="submit">`.

```ts
// playwright/pages/new-project.page.ts
import type { Locator, Page } from '@playwright/test';
import { fillUntilEnabled } from '@nxgt/playwright/helpers';
import { FormPage } from '@nxgt/playwright/pages';

export class NewProjectPage extends FormPage {
	readonly name: Locator;

	constructor(page: Page) {
		super(page, '/projects/new', { submitTestId: 'create-project' });
		this.name = page.getByTestId('project-name');
	}

	async create(name: string) {
		await fillUntilEnabled([[this.name, name]], this.submitButton);
		await this.submit();
	}
}
```

## Sign in once: `authSetup`

`authSetup` declares one setup test per account. Each signs in, waits for the
redirect, and saves `<dir>/<account>.json`. Run it from the setup project
[`defineAppConfig({ setup: true })`](config.md#setup) adds, in
`playwright/config/auth.setup.ts`:

```ts
// playwright/config/auth.setup.ts
import { test } from '@playwright/test';
import { authSetup } from '@nxgt/playwright/auth';
import { SignInPage } from '../pages/sign-in.page';

authSetup(test, {
	accounts: {
		user: { email: 'user@example.com', password: 'user-password' },
		admin: { email: 'admin@example.com', password: 'admin-password' },
	},
	signIn: async (page, account) => {
		const signIn = new SignInPage(page);
		await signIn.goto();
		await signIn.signIn(account);
	},
});
```

This declares `Authenticate as user` and `Authenticate as admin`, writing
`playwright/.auth/user.json` and `playwright/.auth/admin.json`.

```ts
type AuthSetupOptions<A> = {
	accounts: Record<string, A>;
	signIn: (page: Page, account: A) => Promise<unknown>;
	afterSignIn?: string | RegExp | false;
	dir?: string;
};

function authSetup<T extends PlaywrightTestArgs, W extends object, A>(
	test: TestType<T, W>,
	options: AuthSetupOptions<A>,
): void;
```

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `accounts` | `Record<string, A>` | required | One storage state per key; the key is the file name. `A` is whatever `signIn` needs. |
| `signIn` | `(page, account) => Promise<unknown>` | required | Signs the account in. The page is **blank** when it is called: navigate first. |
| `afterSignIn` | `string \| RegExp \| false` | `'/'` | `page.waitForURL(afterSignIn)` before saving. A state saved before the redirect lands can miss the session cookie. `false` skips the wait. |
| `dir` | `string` | `'playwright/.auth'` | Where the states are written. |

An app that lands on a dashboard, with states kept elsewhere:

```ts
authSetup(test, {
	accounts: { user: { email: 'user@example.com', password: 'user-password' } },
	signIn: async (page, account) => {
		const signIn = new SignInPage(page);
		await signIn.goto();
		await signIn.signIn(account);
	},
	afterSignIn: /\/dashboard$/,
	dir: 'e2e/.auth',
});
```

The states hold live session cookies. Ignore them:

```gitignore
playwright/.auth/
```

## Use a signed-in account: `authFile`

```ts
function authFile(account: string, dir?: string): string; // `${dir}/${account}.json`
const DEFAULT_AUTH_DIR = 'playwright/.auth';
```

```ts
// playwright/e2e/admin.spec.ts
import { expect, test } from '@playwright/test';
import { authFile } from '@nxgt/playwright/auth';

test.use({ storageState: authFile('admin') }); // playwright/.auth/admin.json

test('admin sees the settings', async ({ page }) => {
	await page.goto('/settings');
	await expect(page.getByTestId('settings')).toBeVisible();
});
```

With a custom `dir` in `authSetup`, pass the same one: `authFile('user', 'e2e/.auth')`.

## The `login` fixture: `withLoginFixture`

For specs about signing in itself: `login` is the app's sign-in page object,
constructed from `page` and already navigated to with its `goto()`.

```ts
type LoginPageCtor<P extends { goto(): Promise<unknown> }> = new (page: Page) => P;

function withLoginFixture<T extends PlaywrightTestArgs, W extends object, P extends { goto(): Promise<unknown> }>(
	test: TestType<T, W>,
	LoginPage: LoginPageCtor<P>,
): TestType<T & { login: P }, W>;
```

Any class with a one-argument `(page)` constructor and a `goto()` works; a
`BasePage` subclass has both.

```ts
// playwright/e2e/sign-in.spec.ts
import { expect, test as base } from '@playwright/test';
import { withLoginFixture } from '@nxgt/playwright/auth';
import { SignInPage } from '../pages/sign-in.page';

const test = withLoginFixture(base, SignInPage);

test('signs in', async ({ login, page }) => {
	await login.signIn({ email: 'user@example.com', password: 'user-password' });
	await expect(page).toHaveURL('/');
});

test('rejects a wrong password', async ({ login, page }) => {
	await login.signIn({ email: 'user@example.com', password: 'nope' });
	await expect(page.getByRole('alert')).toBeVisible();
});
```

## Putting it together

One `test` for the whole suite, with the msw network ([msw.md](msw.md)) and the
`login` fixture, in the file every spec imports:

```ts
// playwright/config/playwright.setup.ts
import { withLoginFixture } from '@nxgt/playwright/auth';
import { createMswTest } from '@nxgt/playwright/msw';
import { HttpResponse, http } from 'msw';
import { SignInPage } from '../pages/sign-in.page';

export const handlers = [
	http.get('*/api/projects', () => HttpResponse.json([{ id: 1, name: 'Apollo' }])),
];

export const test = withLoginFixture(createMswTest(handlers), SignInPage);
export { expect } from '@playwright/test';
```

```ts
// playwright/e2e/projects.spec.ts
import { authFile } from '@nxgt/playwright/auth';
import { expect, test } from '../config/playwright.setup';
import { NewProjectPage } from '../pages/new-project.page';

test.use({ storageState: authFile('user') });

test('creates a project', async ({ page }) => {
	const form = new NewProjectPage(page);
	await form.goto();
	await form.create('Apollo');
	await expect(page).toHaveURL(/\/projects\/\d+$/);
});
```

`SignInPage` is the one from the [README](../../README.md#pages). The fills
inside it are [`fillUntilEnabled`](helpers.md#filluntilenabled).

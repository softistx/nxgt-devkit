# Migrating from a hand-written `playwright/` folder

How to replace the files most apps copy from one another — the config, the
page base classes, the msw fixture, the auth setup, the paths helper — with
this package, one file at a time. Each step stands alone: the suite stays green
between them.

```bash
bun add -d @nxgt/playwright
```

`@playwright/test`, `msw` and `@msw/playwright` are already installed in such
an app; they are this package's peers, not new dependencies.

## `playwright.config.ts`

Before:

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PW_PORT) || 5174;
const baseURL = process.env.PW_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
	testDir: './playwright/e2e',
	expect: { timeout: 15_000 },
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	use: {
		testIdAttribute: 'data-pw',
		baseURL,
		trace: 'on-first-retry',
		video: 'on-first-retry',
		screenshot: 'only-on-failure',
	},
	projects: [
		{ name: 'setup', testDir: './playwright/config', testMatch: /auth\.setup\.ts$/ },
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] }, dependencies: ['setup'] },
	],
	webServer: {
		command: `bun dev -m test --port ${PORT}`,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		env: { MOCK_AUTH: 'true' },
	},
});
```

After:

```ts
import { defineAppConfig } from '@nxgt/playwright/config';

export default defineAppConfig({
	port: 5174,
	setup: true,
	browsers: ['chromium', 'firefox'],
	env: { MOCK_AUTH: 'true' },
});
```

Compare what differs from the defaults and keep only that:

- a test id attribute other than `data-pw` → `testIdAttribute`;
- a spec folder other than `./playwright/e2e` → `testDir`;
- a server command other than `bun dev -m test --port <port>` → `webServer`;
- anything else (`timeout`, `reporter`, `use.locale`, an extra project) →
  `overrides`. A `webServer` in `overrides` is **added** to the default one;
  put it in the `webServer` option instead.

Every option: [config.md](config.md).

## `base.page.ts` and `form.page.ts`

Before:

```ts
// playwright/pages/base.page.ts
import { expect, type Page } from '@playwright/test';

export class BasePage {
	constructor(
		readonly page: Page,
		readonly path: string,
	) {}

	goto() {
		return this.page.goto(this.path);
	}

	expectTitle(title: RegExp | string) {
		return expect(this.page).toHaveTitle(title);
	}

	screenshot(suffix?: string) {
		const name = this.path.replace(/^\/+/, '').replace(/\//g, '-') || 'index';
		return this.page.screenshot({
			path: `playwright/screenshots/${suffix ? `${name}-${suffix}` : name}.png`,
		});
	}
}

// playwright/pages/form.page.ts
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class FormPage extends BasePage {
	readonly submitButton: Locator;
	constructor(page: Page, path: string) {
		super(page, path);
		this.submitButton = page.getByTestId('submit');
	}
	submit() {
		return this.submitButton.click();
	}
}
```

After: delete both files and change the imports of every page object.

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

One call changes shape: `screenshot('01')` becomes `screenshot({ suffix: '01' })`
— the argument is now Playwright's screenshot options plus `suffix`. The files
land in the same place, `playwright/screenshots/<path>-01.png`.

A submit button with another test id: `super(page, path, { submitTestId: 'save' })`.
Details: [pages-and-fixtures.md](pages-and-fixtures.md).

## `playwright.setup.ts` (the msw fixture)

Before:

```ts
// playwright/config/playwright.setup.ts
import { defineNetworkFixture, type NetworkFixture } from '@msw/playwright';
import { test as base } from '@playwright/test';
import type { AnyHandler } from 'msw';
import { resetMockDb } from '../../src/mocks/db';
import { handlers } from '../../src/mocks/handlers';

type Fixtures = { handlers: AnyHandler[]; network: NetworkFixture };

export const test = base.extend<Fixtures>({
	handlers: [handlers, { option: true }],
	network: [
		async ({ context, handlers }, use) => {
			resetMockDb();
			const network = defineNetworkFixture({ context, handlers });
			await network.enable();
			await use(network);
			await network.disable();
		},
		{ auto: true },
	],
});
export { expect } from '@playwright/test';
```

After:

```ts
// playwright/config/playwright.setup.ts
import { createMswTest } from '@nxgt/playwright/msw';
import { resetMockDb } from '../../src/mocks/db';
import { handlers } from '../../src/mocks/handlers';

export const test = createMswTest(handlers, { onReset: resetMockDb });
export { expect } from '@playwright/test';
```

Specs are unchanged: `test.use({ handlers })` and `network.use(...)` behave as
before. Details: [msw.md](msw.md).

## `auth.setup.ts`

Before:

```ts
// playwright/config/auth.setup.ts
import { test as setup } from '@playwright/test';
import { SignInPage } from '../pages/sign-in.page';
import { ADMIN, USER } from './accounts';
import { PATHS } from './utils';

setup('authenticate as user', async ({ page }) => {
	const signIn = new SignInPage(page);
	await signIn.goto();
	await signIn.signIn(USER);
	await page.waitForURL('/');
	await page.context().storageState({ path: PATHS.auth.user });
});

setup('authenticate as admin', async ({ page }) => {
	const signIn = new SignInPage(page);
	await signIn.goto();
	await signIn.signIn(ADMIN);
	await page.waitForURL('/');
	await page.context().storageState({ path: PATHS.auth.admin });
});
```

After:

```ts
// playwright/config/auth.setup.ts
import { test } from '@playwright/test';
import { authSetup } from '@nxgt/playwright/auth';
import { SignInPage } from '../pages/sign-in.page';
import { ADMIN, USER } from './accounts';

authSetup(test, {
	accounts: { user: USER, admin: ADMIN },
	signIn: async (page, account) => {
		const signIn = new SignInPage(page);
		await signIn.goto();
		await signIn.signIn(account);
	},
});
```

The `waitForURL('/')` is the default `afterSignIn`; pass another URL, or
`false`, if the app lands elsewhere. The files are
`playwright/.auth/user.json` and `playwright/.auth/admin.json` — the keys of
`accounts`.

## `utils.ts` and its `PATHS`

Before:

```ts
// playwright/config/utils.ts
export const PATHS = {
	auth: {
		user: 'playwright/.auth/user.json',
		admin: 'playwright/.auth/admin.json',
	},
	screenshots: 'playwright/screenshots',
};
```

```ts
// playwright/e2e/settings.spec.ts
import { PATHS } from '../config/utils';
import { test } from '../config/playwright.setup';

test.use({ storageState: PATHS.auth.admin });
```

After: delete `utils.ts`.

```ts
// playwright/e2e/settings.spec.ts
import { authFile } from '@nxgt/playwright/auth';
import { test } from '../config/playwright.setup';

test.use({ storageState: authFile('admin') });
```

| Before | After |
| --- | --- |
| `PATHS.auth.<account>` | `authFile('<account>')` |
| `'playwright/.auth'` | `DEFAULT_AUTH_DIR` from `@nxgt/playwright/auth` |
| `PATHS.screenshots` | `DEFAULT_SCREENSHOT_DIR` from `@nxgt/playwright/pages` |
| a slug helper for screenshot names | `screenshotName` from `@nxgt/playwright/helpers` |

Routes a `PATHS` object may also hold (`PATHS.projects = '/projects'`) belong in
the page object that owns them, as its `path`.

## Fill helpers

A local `fillAndWait`, or `waitForTimeout(1000)` before the first fill, are
the hydration reset worked around by hand. Replace them with
[`fillSettled` and `fillUntilEnabled`](helpers.md):

```ts
// before
await page.waitForTimeout(1000);
await page.getByTestId('name').fill('Apollo');

// after
await fillSettled(page.getByTestId('name'), 'Apollo');
```

## What is left

```
playwright.config.ts            ← defineAppConfig({ ... })
playwright/
  config/
    accounts.ts                 ← your test accounts
    auth.setup.ts               ← authSetup(test, { ... })
    playwright.setup.ts         ← createMswTest(handlers, { onReset })
  pages/                        ← your page objects, extending BasePage / FormPage
  e2e/                          ← your specs, unchanged but for imports
```

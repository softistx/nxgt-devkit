# @nxgt/playwright

The Playwright boilerplate every app ends up writing, written once: a shared
`playwright.config.ts`, `BasePage` and `FormPage` page objects, sign-in and
storage-state fixtures, msw network fixtures, hydration-safe fills, and
Storybook stories run as Vitest browser tests that can also capture WebP
previews of your components.

## Install

```bash
bun add -d @nxgt/playwright @playwright/test
```

Every peer is optional except `typescript` (`^6.0.3`); install the ones for the
subpaths you import:

| Subpath | Peers to add |
| --- | --- |
| `.`, `/config`, `/pages`, `/auth`, `/helpers` | `@playwright/test` (`^1.55.0`) |
| `/msw` | `@playwright/test`, `msw` (`^2.12.10`), `@msw/playwright` (`>=0.6.7 <1`) |
| `/storybook`, `/storybook/capture`, `/storybook/setup` | `vitest` (`^4.0.0`), `@vitest/browser-playwright` (`^4.0.0`), `@storybook/addon-vitest` (`>=10.3.0 <11`), and `playwright` itself (required by `@vitest/browser-playwright`) |

```bash
bun add -d msw @msw/playwright                                        # for /msw
bun add -d vitest @vitest/browser-playwright @storybook/addon-vitest playwright  # for /storybook
```

The package is ESM only and its declarations use extensionless relative
imports, so the consumer's `tsconfig.json` needs
`"moduleResolution": "bundler"` (the Vite and Bun default).

## Subpaths

| Subpath | Exports | Runs in |
| --- | --- | --- |
| `@nxgt/playwright` | everything from `/config`, `/pages`, `/auth`, `/helpers` | Node |
| `@nxgt/playwright/config` | `defineAppConfig`, `AppConfigOptions`, `Browser` | Node |
| `@nxgt/playwright/pages` | `BasePage`, `FormPage`, `DEFAULT_SCREENSHOT_DIR`, option types | Node |
| `@nxgt/playwright/auth` | `authSetup`, `authFile`, `withLoginFixture`, `DEFAULT_AUTH_DIR` | Node |
| `@nxgt/playwright/helpers` | `fillSettled`, `fillUntilEnabled`, `screenshotName` | Node |
| `@nxgt/playwright/msw` | `createMswTest`, `MswFixtures`, `MswTestOptions` | Node |
| `@nxgt/playwright/storybook` | `storybookProject`, `componentId`, `titleToComponentId`; types `StorybookProjectOptions`, `PreviewCaptureOptions` | Node (Vitest config) |
| `@nxgt/playwright/storybook/capture` | `capturePreview` | **browser only** |
| `@nxgt/playwright/storybook/setup` | an `afterEach(capturePreview)` side effect | **browser only** |

The root barrel does not re-export `/msw` or `/storybook`, so an app without
those peers can still import it.

## Usage

### Config

```ts
// playwright.config.ts
import { defineAppConfig } from '@nxgt/playwright/config';

export default defineAppConfig({ port: 5174, setup: true });
```

Specs in `./playwright/e2e`, Chromium, Firefox, Edge and Chrome, `data-pw` as
the test id attribute, `bun dev -m test --port 5174` started for you (reused
locally, fresh on CI), and an auth `setup` project every browser depends on.
All of it is an option: [docs/guide/config.md](docs/guide/config.md).

### Pages

```ts
// playwright/pages/sign-in.page.ts
import type { Locator, Page } from '@playwright/test';
import { fillUntilEnabled } from '@nxgt/playwright/helpers';
import { FormPage } from '@nxgt/playwright/pages';

export type Account = { email: string; password: string };

export class SignInPage extends FormPage {
	readonly email: Locator;
	readonly password: Locator;

	constructor(page: Page) {
		super(page, '/login');
		this.email = page.getByTestId('email');
		this.password = page.getByTestId('password');
	}

	async signIn({ email, password }: Account) {
		await fillUntilEnabled(
			[
				[this.email, email],
				[this.password, password],
			],
			this.submitButton,
		);
		await this.submit();
	}
}
```

`BasePage` gives `goto()`, `expectTitle()`, `waitForURL()` and a
`screenshot()` named after the path; `FormPage` adds `submitButton` (test id
`submit`) and `submit()`.

### Auth

Sign in once per account in a setup project, then reuse the saved storage
state:

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

```ts
// playwright/e2e/projects.spec.ts
import { expect, test as base } from '@playwright/test';
import { authFile, withLoginFixture } from '@nxgt/playwright/auth';
import { SignInPage } from '../pages/sign-in.page';

// Adds `login`: the sign-in page, already open.
const test = withLoginFixture(base, SignInPage);

test.describe('signed in', () => {
	test.use({ storageState: authFile('user') }); // playwright/.auth/user.json

	test('lists projects', async ({ page }) => {
		await page.goto('/projects');
		await expect(page.getByTestId('projects')).toBeVisible();
	});
});

test('signs in', async ({ login, page }) => {
	await login.signIn({ email: 'user@example.com', password: 'user-password' });
	await expect(page).toHaveURL('/');
});
```

### Helpers

A server-rendered input can be filled before the framework hydrates it; when
it does, a controlled input is reset to its initial value and the fill is
silently lost. `fillSettled` fills, waits, and retries until the value
survives; `fillUntilEnabled` does the same for a whole form and its submit
button, which enables on the first fill and is disabled again by the reset.

```ts
import { expect, test } from '@playwright/test';
import { fillSettled, fillUntilEnabled } from '@nxgt/playwright/helpers';

test('creates a project', async ({ page }) => {
	await page.goto('/projects/new');
	await fillSettled(page.getByTestId('search'), 'Ada');
	await fillUntilEnabled(
		[[page.getByTestId('name'), 'Apollo']],
		page.getByTestId('submit'),
	);
	await page.getByTestId('submit').click();
});
```

### msw

```ts
// playwright/config/playwright.setup.ts
import { createMswTest } from '@nxgt/playwright/msw';
import { HttpResponse, http } from 'msw';

let projects = [{ id: 1, name: 'Apollo' }];

export const test = createMswTest(
	[http.get('*/api/projects', () => HttpResponse.json(projects))],
	{ onReset: () => (projects = [{ id: 1, name: 'Apollo' }]) },
);
export { expect } from '@playwright/test';
```

```ts
// playwright/e2e/projects.spec.ts
import { HttpResponse, http } from 'msw';
import { expect, test } from '../config/playwright.setup';

test.describe('empty', () => {
	// Replaces the default handlers for this block.
	test.use({
		handlers: [http.get('*/api/projects', () => HttpResponse.json([]))],
	});

	test('shows the empty state', async ({ page }) => {
		await page.goto('/projects');
		await expect(page.getByTestId('empty')).toBeVisible();
	});
});

test('shows a server error', async ({ page, network }) => {
	// Takes precedence over the defaults, for this test only.
	network.use(
		http.get('*/api/projects', () => new HttpResponse(null, { status: 500 })),
	);
	await page.goto('/projects');
	await expect(page.getByRole('alert')).toBeVisible();
});
```

### Storybook

```ts
// vite.config.ts
import { storybookProject } from '@nxgt/playwright/storybook';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			{ extends: true, test: { name: 'unit', environment: 'node' } },
			storybookProject(), // every story renders in Chromium
			storybookProject({ capture: true }), // stories tagged `preview` → docs/previews/*.webp
		],
	},
});
```

```jsonc
// package.json
"scripts": {
	"test:stories": "vitest run --project storybook",
	"docs:previews": "vitest run --project previews"
}
```

Tag one story per component; its preview is saved as
`docs/previews/<component id>.webp` (`Form fields/TextField` →
`form-fields-textfield.webp`), cropped to what is painted:

```tsx
export const Default: Story = { args: { label: 'Name' }, tags: ['preview'] };
```

On a distribution Playwright does not ship a Chromium for (Arch, Manjaro), point
it at the system one:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium bun run test:stories
```

## Traps

- **Test ids are `data-pw`, not `data-testid`.** `getByTestId('submit')` finds
  `data-pw="submit"`; pass `testIdAttribute: 'data-testid'` to keep yours.
- **The default browsers include the `chrome` and `msedge` channels**, which
  `bunx playwright install` does not download: `bunx playwright install chrome msedge`,
  or `browsers: ['chromium']`.
- **The default web server runs `bun dev -m test --port <port>`.** An app whose
  `dev` script does not take those flags passes `webServer` (or `false`).
- **A `webServer` in `overrides` adds a second server**, it does not replace
  the first: set it with the `webServer` option.
- **`auth.setup.ts` belongs in `playwright/config/`** — the `setup` project
  looks only there — and `playwright/.auth/` holds live session cookies:
  add it to `.gitignore`.
- **`test.use({ handlers })` replaces the default handlers**; to add one, use
  `network.use(...)` or spread the defaults after it.
- **Never import `/storybook/capture` or `/storybook/setup` from Node** — they
  touch `document`. `storybookProject()` already registers the setup file.
- **Only one story per component should carry `preview`**: they share one file
  name, so the last one captured wins.

## Documentation

- [Guide](docs/README.md) — every option, default and the realistic setup, per area.
- [Troubleshooting](docs/troubleshooting.md) — the error you are looking at, and its fix.
- [Roadmap](docs/roadmap.md) — what is coming, and what is not planned.

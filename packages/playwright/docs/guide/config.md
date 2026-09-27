# Config

`defineAppConfig` builds the whole `playwright.config.ts` an app needs from its
port, with the defaults most apps repeat by hand.

```ts
// playwright.config.ts
import { defineAppConfig } from '@nxgt/playwright/config';

export default defineAppConfig({ port: 5174 });
```

That is a complete config: specs in `./playwright/e2e`, four desktop browsers,
`bun dev -m test --port 5174` started before the run, `baseURL`
`http://localhost:5174`, and test ids read from `data-pw`.

## Signature

```ts
import type { PlaywrightTestConfig } from '@playwright/test';

type Browser = 'chromium' | 'firefox' | 'webkit' | 'msedge' | 'chrome';

type AppConfigOptions = {
	port: number;
	baseURL?: string;
	browsers?: Browser[];
	setup?: boolean | { testDir?: string; testMatch?: RegExp };
	webServer?: PlaywrightTestConfig['webServer'] | false;
	env?: Record<string, string>;
	testDir?: string;
	testIdAttribute?: string;
	overrides?: PlaywrightTestConfig;
};

function defineAppConfig(options: AppConfigOptions): PlaywrightTestConfig;
```

`defineAppConfig` is also exported from the root, `@nxgt/playwright`.

## Options

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `port` | `number` | required | The dev server's port. `PW_PORT` in the environment wins. |
| `baseURL` | `string` | `http://localhost:<port>` | `use.baseURL`, and the URL the web server is awaited on. `PW_BASE_URL` wins. |
| `browsers` | `Browser[]` | `['chromium', 'firefox', 'msedge', 'chrome']` | One project per browser, named after it. |
| `setup` | `boolean \| { testDir?, testMatch? }` | `false` | Adds a `setup` project every browser depends on. `true` = `./playwright/config`, `/auth\.setup\.ts$/`. |
| `webServer` | `PlaywrightTestConfig['webServer'] \| false` | `bun dev -m test --port <port>` | The server Playwright starts. `false` for a stack already running. |
| `env` | `Record<string, string>` | none | Extra environment for the **default** web server only. |
| `testDir` | `string` | `./playwright/e2e` | Where the browser projects look for specs. |
| `testIdAttribute` | `string` | `data-pw` | What `getByTestId` matches. |
| `overrides` | `PlaywrightTestConfig` | `{}` | Merged last with Playwright's `defineConfig`. |

### `port`, `baseURL` and the environment

```ts
export default defineAppConfig({ port: 5174 });
```

```bash
PW_PORT=6000 bunx playwright test                           # server and baseURL on :6000
PW_BASE_URL=http://app.localhost:6000 bunx playwright test  # baseURL only
```

`PW_PORT` changes both the server command and the default `baseURL`;
`PW_BASE_URL` changes only the URL tests and the server wait use — handy behind
a local proxy or a custom hostname.

### `browsers`

```ts
export default defineAppConfig({ port: 5174, browsers: ['chromium'] });
```

| Browser | Device | Channel |
| --- | --- | --- |
| `chromium` | `Desktop Chrome` | bundled Chromium |
| `firefox` | `Desktop Firefox` | bundled Firefox |
| `webkit` | `Desktop Safari` | bundled WebKit |
| `msedge` | `Desktop Edge` | `msedge` (installed Edge) |
| `chrome` | `Desktop Chrome` | `chrome` (installed Chrome) |

`msedge` and `chrome` are branded channels: `bunx playwright install` does not
fetch them. Install them with `bunx playwright install chrome msedge`, or leave
them out.

### `setup`

```ts
export default defineAppConfig({ port: 5174, setup: true });
```

Produces a first project `{ name: 'setup', testDir: './playwright/config', testMatch: /auth\.setup\.ts$/ }`
and adds `dependencies: ['setup']` to every browser project, so accounts are
signed in once before any spec runs. The file itself is written with
`authSetup` — see [pages-and-fixtures.md](pages-and-fixtures.md#sign-in-once-authsetup).

The match is by name on purpose: a `playwright.setup.ts` (where an msw `test`
usually lives) shares the `.setup.ts` suffix and must not run as a setup
project. Somewhere else:

```ts
export default defineAppConfig({
	port: 5174,
	setup: { testDir: './e2e/setup', testMatch: /login\.setup\.ts$/ },
});
```

### `webServer` and `env`

The default server is:

```ts
{
	command: `bun dev -m test --port ${port}`,
	url: baseURL,
	reuseExistingServer: !process.env.CI, // reused locally, fresh on CI
	env, // only when `env` is given
}
```

For a Vite app, `-m test` is `--mode test`, so it loads `.env.test`. Pass `env` for
flags the app reads at start-up:

```ts
export default defineAppConfig({ port: 5174, env: { MOCK_AUTH: 'true' } });
```

An app that does not start with `bun dev`, or several servers:

```ts
export default defineAppConfig({
	port: 3000,
	webServer: [
		{ command: 'bun run api', url: 'http://localhost:4000/health' },
		{ command: 'bun run start', url: 'http://localhost:3000' },
	],
});
```

A stack that is already up (docker compose, a staging URL):

```ts
export default defineAppConfig({
	port: 443,
	baseURL: 'https://staging.example.com',
	webServer: false,
});
```

### `testIdAttribute`

```ts
export default defineAppConfig({ port: 5174, testIdAttribute: 'data-testid' });
```

The default `data-pw` keeps test hooks apart from ids other tools read.
`FormPage` finds its submit button through this attribute too.

### `overrides`

```ts
export default defineAppConfig({
	port: 5174,
	overrides: {
		timeout: 60_000,
		reporter: [['list'], ['html', { open: 'never' }]],
		use: { locale: 'fr-FR' },
	},
});
```

`overrides` is merged by Playwright's own `defineConfig`, which means:

- top-level keys (`timeout`, `reporter`, `testMatch`, …) replace the default;
- `use`, `expect` and `build` are merged key by key — `use: { locale }` keeps
  `baseURL` and `testIdAttribute`;
- `projects` are merged **by name**: `{ name: 'chromium', use: { … } }`
  amends the chromium project, a new name is appended;
- `webServer` is **appended**, not replaced. Use the `webServer` option to
  change the server.

## Defaults

What the returned config holds when only `port` is given:

| Key | Locally | On CI (`CI` set) |
| --- | --- | --- |
| `testDir` | `./playwright/e2e` | same |
| `fullyParallel` | `true` | same |
| `forbidOnly` | `false` | `true` |
| `retries` | `0` | `2` |
| `workers` | Playwright's default | `1` |
| `reporter` | `html` | same |
| `expect.timeout` | `15_000` | same |
| `use.trace` / `use.video` | `on-first-retry` | same |
| `use.screenshot` | `only-on-failure` | same |
| `webServer.reuseExistingServer` | `true` | `false` |

## A realistic config

An SSR app with signed-in specs, mocked auth in the test server, one browser
locally and two on CI, and a list reporter on CI:

```ts
// playwright.config.ts
import { defineAppConfig } from '@nxgt/playwright/config';

const ci = Boolean(process.env.CI);

export default defineAppConfig({
	port: 5174,
	setup: true,
	browsers: ci ? ['chromium', 'firefox'] : ['chromium'],
	env: { MOCK_AUTH: 'true' },
	overrides: {
		timeout: 60_000,
		reporter: ci ? [['list'], ['html', { open: 'never' }]] : 'html',
	},
});
```

With the folder layout the defaults expect:

```
playwright.config.ts
playwright/
  config/
    auth.setup.ts          ← authSetup(...)            (setup project)
    playwright.setup.ts    ← export const test = ...    (msw, fixtures)
  pages/
    sign-in.page.ts        ← class SignInPage extends FormPage
  e2e/
    projects.spec.ts
  .auth/                   ← storage states — gitignored
  screenshots/             ← BasePage.screenshot() — gitignored
```

Next: [pages-and-fixtures.md](pages-and-fixtures.md) for the page objects and
sign-in, [msw.md](msw.md) for the network fixture, and
[migrating.md](migrating.md) if the folder already exists.

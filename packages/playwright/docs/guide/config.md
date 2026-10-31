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
type DeviceName = 'Pixel 7' | 'iPhone 14' | … ; // every name in Playwright's `devices`
type MobileProject = DeviceName | { device: DeviceName; name: string };

type AppConfigOptions = {
	port: number;
	baseURL?: string;
	browsers?: Browser[];
	setup?: boolean | { testDir?: string; testMatch?: RegExp };
	mobile?: boolean | MobileProject[];
	webServer?: PlaywrightTestConfig['webServer'] | false;
	env?: Record<string, string>;
	testDir?: string;
	testIdAttribute?: string;
	screens?: boolean | { dir?: string; env?: string };
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
| `mobile` | `boolean \| MobileProject[]` | `false` | Phone projects after the desktop ones. `true` = `['Pixel 7']`, named `mobile-chromium`. |
| `webServer` | `PlaywrightTestConfig['webServer'] \| false` | `bun dev -m test --port <port>` | The server Playwright starts. `false` for a stack already running. |
| `env` | `Record<string, string>` | none | Extra environment for the **default** web server only. |
| `testDir` | `string` | `./playwright/e2e` | Where the browser projects look for specs. |
| `testIdAttribute` | `string` | `data-pw` | What `getByTestId` matches. |
| `screens` | `boolean \| { dir?, env? }` | `false` | Full-page screens on a `SCREENS=1` run: [screens.md](screens.md). |
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

### `mobile`

```ts
export default defineAppConfig({ port: 5174, browsers: ['chromium'], mobile: true });
// projects: chromium, mobile-chromium
```

Each entry is a name from Playwright's
[`devices`](https://playwright.dev/docs/emulation#devices) — its viewport,
user agent, `isMobile`, `hasTouch` and scale factor — run in the browser that
device names (`defaultBrowserType`). The project is called
`mobile-<browser>`:

```ts
export default defineAppConfig({
	port: 5174,
	browsers: ['chromium', 'firefox'],
	mobile: ['Pixel 7', 'iPhone 14'],
});
// projects: chromium, firefox, mobile-chromium, mobile-webkit
```

How it combines with `browsers`, so the project list is never a surprise:

- Mobile projects are **added after** the desktop ones; `browsers` does not
  filter them. `browsers: []` with `mobile: true` runs the phone only.
- With `setup`, every mobile project gets `dependencies: ['setup']`, like the
  desktop ones, so a spec on a phone uses the same
  `test.use({ storageState: authFile('user') })` as on the desktop.
- Two devices on the same browser would both be `mobile-chromium`: name one,
  or `defineAppConfig` throws.

  ```ts
  mobile: ['Pixel 7', { device: 'Galaxy S9+', name: 'mobile-small' }];
  ```

- A name that is not in `devices` is a type error, and throws for a
  JavaScript config; so does a desktop entry (`'Desktop Firefox'`).
- `overrides.projects` amends a mobile project by name, as it does the others:
  `{ name: 'mobile-chromium', use: { locale: 'fr-FR' } }`.

What each browser can emulate:

| Browser | Phone emulation | How to get it |
| --- | --- | --- |
| Chromium | full: viewport, `isMobile` (meta viewport, mobile layout), touch | `mobile: true`, or any Android device (`'Pixel 7'`, `'Galaxy S24'`) |
| WebKit | full | an iPhone or iPad device (`'iPhone 14'`); needs `bunx playwright install webkit`, which is why it is never added by default |
| Firefox | **no `isMobile`**: the meta viewport is ignored and the page lays out like a desktop page in a narrow window; `hasTouch` and the viewport work | not through `mobile` (no Firefox device exists); add the project yourself, below |

A phone-sized Firefox, for layouts that only need the width and touch events:

```ts
import { devices } from '@playwright/test';

export default defineAppConfig({
	port: 5174,
	setup: true,
	mobile: true,
	overrides: {
		projects: [
			{
				name: 'mobile-firefox',
				use: {
					...devices['Desktop Firefox'],
					viewport: { width: 412, height: 839 },
					hasTouch: true,
				},
				dependencies: ['setup'], // overrides are not given it for you
			},
		],
	},
});
```

On a phone project, `expectNoHorizontalScroll` (from `/helpers`) checks the
layout fits — see [helpers.md](helpers.md#expectnohorizontalscroll).

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

### `screens`

```ts
export default defineAppConfig({ port: 5174, screens: true });
```

Stores the screens folder and whether this run saves in the config's
`metadata`, and on a `SCREENS=1` run empties the folder first. Everything
about it, including the `globalSetup` it sets, is in [screens.md](screens.md).

### `warmUp`

```ts
export default defineAppConfig({ port: 5174, warmUp: { path: '/sign-in' } });
```

Opens the path in Chromium once before the specs and reloads it until it
hydrates, so a cold dev server does not fail the first spec. `true` opens `/`.
Default `false`.
Options, the `warmUp()` helper and the failure message are in
[hydration.md](hydration.md#warming-a-cold-dev-server-up).

## `selectedProjects`

The `--project` names on the command line, from `@nxgt/playwright/config` (also
the root).

```ts
function selectedProjects(argv?: readonly string[], env?: NodeJS.ProcessEnv): string[];
function projectsFromArgv(argv: readonly string[]): string[];
const PROJECTS_ENV = 'PW_PROJECTS';
```

```ts
import { selectedProjects } from '@nxgt/playwright/config';

selectedProjects(); // bunx playwright test --project=chromium --project mobile-chromium
// ['chromium', 'mobile-chromium']; [] when no --project was given
```

Names come in order, as written (`--project x` and `--project=x`; a wildcard
such as `*chromium` is returned as is).

**Why not read `process.argv`?** Playwright's workers load the config again,
without the command line. A config that branches on `process.argv` builds one
thing in the runner and another in each worker. `selectedProjects` writes the
runner's answer to `PW_PROJECTS` (a JSON array) and, in a worker
(`TEST_WORKER_INDEX` set), reads it back. `defineAppConfig` calls it too, so
the variable is always there. `projectsFromArgv` is the pure parser, without
the environment.

### A project that runs alone

A `pwa` project that runs by itself against a production build on a port of
its own, while the other projects keep the dev server. `/pwa`'s `isPwaRun`
reads the selection (`selectedProjects().includes('pwa')`, or `PWA=1`) and
`pwaProject` gives the run's options:

```ts
// playwright.config.ts
import { defineAppConfig } from '@nxgt/playwright/config';
import { isPwaRun, pwaProject } from '@nxgt/playwright/pwa';

export default defineAppConfig(
	isPwaRun()
		? pwaProject({ port: 5274 }) // bun run build && bun run start, PORT=5274
		: { port: 5273, setup: true, browsers: ['chromium', 'firefox'], mobile: true },
);
```

```bash
bunx playwright test --project=pwa
```

Another project that runs alone is the same switch by hand:

```ts
const smoke = process.env.SMOKE === '1' || selectedProjects().includes('smoke');

export default defineAppConfig({
	port: smoke ? 5275 : 5273,
	...(smoke && {
		browsers: [],
		webServer: { command: 'bun run preview --port 5275', url: 'http://localhost:5275' },
		overrides: { projects: [{ name: 'smoke', testDir: './playwright/smoke' }] },
	}),
});
```

An absent (or `undefined`) `webServer` gives the default dev server; the
spread above sets one only for that run. The PWA specs and every
`pwaProject` option are in [pwa.md](pwa.md#pwaproject-and-ispwarun).

It reads the command line only: UI mode (`--ui`) and editor extensions pick
projects without `--project`, and give `[]`. Keep an environment switch
(`PWA=1`) beside it for those.

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

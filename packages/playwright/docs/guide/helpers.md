# Helpers

Fills that survive hydration (`fillSettled`, `fillUntilEnabled`) and the
screenshot file name `BasePage` uses (`screenshotName`), from
`@nxgt/playwright/helpers` or the root.

```ts
import { expect, test } from '@playwright/test';
import { fillSettled } from '@nxgt/playwright/helpers';

test('searches', async ({ page }) => {
	await page.goto('/projects');
	const search = page.getByTestId('search');
	await fillSettled(search, 'Apollo');
	await expect(search).toHaveValue('Apollo');
});
```

## Why a plain `fill` is lost

A server-rendered page has its inputs in the HTML, visible and fillable,
before the framework's JavaScript has run. Playwright fills them as soon as
they are actionable. Then the framework hydrates, and a controlled input is
reset to its initial state value — usually `''`. The value typed a moment ago
is gone, no error is raised, and the test fails later on a validation message
or an empty request.

Waiting a fixed time before filling hides it on a fast machine and fails on a
slow CI runner. These helpers fill, wait `settle` ms, and check the value is
still there — a value that survives the wait was typed into a hydrated input.
If it did not, they fill again, until `timeout`.

## `fillSettled`

```ts
type FillSettledOptions = {
	settle?: number; // default 300
	timeout?: number; // default 30_000
};

function fillSettled(input: Locator, value: string, options?: FillSettledOptions): Promise<void>;
```

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `settle` | `number` (ms) | `300` | How long the value must survive before it counts. Raise it past the app's hydration time. |
| `timeout` | `number` (ms) | `30_000` | Give up after this long; the last `toHaveValue` failure is thrown. |

```ts
await fillSettled(page.getByTestId('name'), 'Ada', { settle: 400 });
```

It throws the usual Playwright assertion error (`expect(locator).toHaveValue`
… timed out) when the value never holds within `timeout`, wrapped by
`toPass`.

## `fillUntilEnabled`

For a form whose submit button stays disabled until the form is valid. The
button enables on the first fill, **before** hydration resets the fields and
disables it again, so seeing it enabled once proves nothing.
`fillUntilEnabled` fills every field, waits for `submit` to be enabled, waits
`settle` ms, and checks every value and the button again — refilling the whole
set if any was reset.

```ts
function fillUntilEnabled(
	fields: ReadonlyArray<readonly [Locator, string]>,
	submit: Locator,
	options?: FillSettledOptions,
): Promise<void>;
```

Same options as `fillSettled`. It does not click: the button is left enabled
for you.

```ts
import { expect, test } from '@playwright/test';
import { fillUntilEnabled } from '@nxgt/playwright/helpers';

test('signs up', async ({ page }) => {
	await page.goto('/signup');
	const submit = page.getByTestId('submit');
	await fillUntilEnabled(
		[
			[page.getByTestId('email'), 'ada@example.com'],
			[page.getByTestId('password'), 'correct horse battery staple'],
		],
		submit,
	);
	await submit.click();
	await expect(page).toHaveURL('/welcome');
});
```

In a page object, pass `FormPage`'s `submitButton` — see
[pages-and-fixtures.md](pages-and-fixtures.md#formpage).

## `screenshotName`

The slug `BasePage.screenshot()` names its files with.

```ts
function screenshotName(path: string, suffix?: string): string;
```

```ts
import { screenshotName } from '@nxgt/playwright/helpers';

screenshotName('/projects/42'); // 'projects-42'
screenshotName('/a/b?tab=1#top'); // 'a-b'
screenshotName('/'); // 'index'
screenshotName('/auth/login', '01'); // 'auth-login-01'
```

Useful when a screenshot is taken outside a page object, or for a visual
comparison named like the page files:

```ts
await expect(page).toHaveScreenshot(`${screenshotName('/projects')}.png`);
```

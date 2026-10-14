# Content-Security-Policy

`@nxgt/playwright/csp` fails a spec when a page ran into its own
Content-Security-Policy, and checks that a server nonces its scripts. It needs
only `@playwright/test`; the root barrel does not re-export it.

## Fail a test on a refusal

```ts
import { cspTest as test } from '@nxgt/playwright/csp';

test('home', async ({ page }) => {
	await page.goto('/');
});
```

`cspTest` is Playwright's `test` with an automatic `cspGuard` fixture. For your
own `test` (login, hydration…), compose it:

```ts
import { test as base } from '@playwright/test';
import { withCspGuard } from '@nxgt/playwright/csp';

export const test = withCspGuard(base);
```

After the test, the guard asserts `expect(violations,
'Content-Security-Policy refusals').toEqual([])`. A line reads
`script-src-elem refused inline in http://localhost/ (file:3 sample)`, or
`console: <text> (<url>)` for the console error Chromium and Firefox log
(errors only: Firefox also logs an info-level warning about `'self'` beside
`'strict-dynamic'`, which is not a refusal).

## Read the refusals yourself

```ts
import { watchCsp } from '@nxgt/playwright/csp';

test('the widget loads', async ({ context, page }) => {
	const refusals = await watchCsp(context); // before the first goto
	await page.goto('/widget');
	expect(refusals).toEqual([]);
});
```

`watchCsp` listens in every page of the context from then on, through a
`securitypolicyviolation` listener and a binding named `__nxgtCspViolation`.

## Check the nonce

```ts
import { expectNoncedPage } from '@nxgt/playwright/csp';

test('the home page is nonced', async ({ request }) => {
	await expectNoncedPage(request, '/', {
		scriptSrc: "'self' 'nonce-{nonce}' 'strict-dynamic'",
	});
});
```

It loads the path twice and checks that:

1. the `content-security-policy` header names `'nonce-<value>'` in
   `script-src` (a base64 or base64url value of at least 16 characters);
2. every `<script>` and `<link rel="modulepreload">` of the HTML has
   `nonce="<that value>"`, and there is at least one;
3. the second load's nonce differs.

`scriptSrc` is optional: with it, the whole `script-src` value must equal it,
the nonce written `{nonce}`. The policy's shape is yours; the helper never
assumes one. `loadPolicy(request, path)` returns `{ policy, nonce, html }` and
`cspNonce(policy)` reads the nonce of a policy string, for your own checks.

## Signatures

```ts
function watchCsp(context: BrowserContext): Promise<string[]>;
function withCspGuard<T, W>(test: TestType<T, W>): TestType<T & { cspGuard: undefined }, W>;
const cspTest: ReturnType<typeof withCspGuard>;
function expectNoncedPage(
	request: APIRequestContext,
	path: string,
	options?: { scriptSrc?: string },
): Promise<void>;
function loadPolicy(request: APIRequestContext, path: string): Promise<{
	policy: string;
	nonce: string | undefined;
	html: string;
}>;
function cspNonce(policy: string): string | undefined;
```

Errors and their fixes are in [troubleshooting](../troubleshooting.md#content-security-policy).

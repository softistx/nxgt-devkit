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

The guard also gives the test a `cspViolations` fixture, the array it will
assert on, so a spec can poll it. A spec that expects a refusal turns the
guard off with `test.use({ cspGuard: false })`:

```ts
test.describe('a blocked widget', () => {
	test.use({ cspGuard: false });

	test('the inline script is refused', async ({ page, cspViolations }) => {
		await page.goto('/widget');
		await expect.poll(() => cspViolations.length).toBeGreaterThan(0);
	});
});
```

After the test, the guard asserts `expect(violations,
'Content-Security-Policy refusals').toEqual([])`. A line reads
`script-src-elem refused inline in http://localhost/ (file:3 sample)`, or
`console: <text> (<url>)` for the console error Chromium and Firefox log
(errors only: Firefox also logs an info-level warning about `'self'` beside
`'strict-dynamic'`, which is not a refusal).

One refusal can appear twice in Chromium: once from the
`securitypolicyviolation` event and once as the console error. Both are kept,
since another browser may report only the console line. A second `watchCsp`
call for the same context returns the same array and adds no listener.

## Read the refusals yourself

```ts
import { expect, test } from '@playwright/test';
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
import { test } from '@playwright/test';
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
assumes one. It reads the server-rendered HTML (what `request.get` returns), not the DOM,
and `script-src` only: not `script-src-elem` nor `default-src`. Several
policies (repeated headers, which Playwright joins) are each searched.

`loadPolicy(request, path)` returns a `LoadedPolicy` (`{ policy, nonce, html }`)
and `cspNonce(policy)` reads the nonce of a policy string, for your own checks:

```ts
import { expect, test } from '@playwright/test';
import { cspNonce, loadPolicy } from '@nxgt/playwright/csp';

test('the policy forbids unsafe-inline', async ({ request }) => {
	const { policy, nonce } = await loadPolicy(request, '/');
	expect(nonce).toBeDefined();
	expect(policy).not.toContain("'unsafe-inline'");
	expect(cspNonce(policy)).toBe(nonce);
});
```

## Signatures

```ts
function watchCsp(context: BrowserContext): Promise<string[]>;
type CspGuardFixtures = { cspViolations: string[]; cspGuard: boolean };
function withCspGuard<T, W>(test: TestType<T, W>): TestType<T & CspGuardFixtures, W>;
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

import { test as base, expect } from '@playwright/test';
import {
	cspNonce,
	cspTest,
	expectNoncedPage,
	loadPolicy,
	watchCsp,
	withCspGuard,
} from '../../src/csp';

base(
	'watchCsp collects the event and the console line of a refusal',
	async ({ context, page }) => {
		const violations = await watchCsp(context);
		await page.goto('/csp/inline');
		await expect.poll(() => violations.length).toBeGreaterThanOrEqual(2);
		const event = violations.find((line) => !line.startsWith('console:'));
		expect(event).toMatch(
			/^script-src(-elem)? refused inline in .*\/csp\/inline /,
		);
		expect(violations.some((line) => line.startsWith('console: '))).toBe(true);
		expect(violations.join('\n')).toMatch(
			/Refused to|Content Security Policy/i,
		);
	},
);

base(
	'watchCsp stays empty on a page the policy accepts',
	async ({ context, page }) => {
		const violations = await watchCsp(context);
		await page.goto('/csp/good');
		await expect(page).toHaveTitle('ran');
		expect(violations).toEqual([]);
	},
);

// The guard's assertion runs in fixture teardown, so a refusal fails the test
// after its body. `test.fail()` inverts that: this test passes only when the
// guard fails it, and the clean page below proves the guard is not always red.
const guarded = withCspGuard(base);

guarded.describe('withCspGuard', () => {
	guarded.fail(
		'fails a test whose page met a refusal',
		async ({ page, cspViolations }) => {
			await page.goto('/csp/inline');
			await expect.poll(() => cspViolations.length).toBeGreaterThan(0);
		},
	);

	guarded('passes a clean page', async ({ page, cspViolations }) => {
		await page.goto('/csp/good');
		await expect(page).toHaveTitle('ran');
		expect(cspViolations).toEqual([]);
	});

	guarded.describe('with the guard off', () => {
		guarded.use({ cspGuard: false });
		guarded(
			'a spec may expect the refusal',
			async ({ page, cspViolations }) => {
				await page.goto('/csp/inline');
				await expect.poll(() => cspViolations.length).toBeGreaterThan(0);
			},
		);
	});
});

base('watchCsp is idempotent per context', async ({ context, page }) => {
	const first = await watchCsp(context);
	expect(await watchCsp(context)).toBe(first);
	await page.goto('/csp/inline');
	await expect.poll(() => first.length).toBeGreaterThan(0);
	// One listener: the event is reported once (the console line is separate).
	expect(first.filter((line) => !line.startsWith('console:'))).toHaveLength(1);
});

base.describe('expectNoncedPage', () => {
	base(
		'passes on a page whose tags all carry the nonce',
		async ({ request }) => {
			await expectNoncedPage(request, '/csp/good');
			const { policy, nonce } = await loadPolicy(request, '/csp/good');
			expect(cspNonce(policy)).toBe(nonce);
		},
	);

	base('scriptSrc asserts the whole directive', async ({ request }) => {
		await expectNoncedPage(request, '/csp/good', {
			scriptSrc: "'self' 'nonce-{nonce}' 'strict-dynamic'",
		});
		await expect(
			expectNoncedPage(request, '/csp/good', { scriptSrc: "'nonce-{nonce}'" }),
		).rejects.toThrow(/script-src/);
	});

	base('fails when a tag lacks the nonce', async ({ request }) => {
		await expect(expectNoncedPage(request, '/csp/missing')).rejects.toThrow(
			/tags without the policy's nonce/,
		);
	});

	base(
		'fails when the nonce does not change between loads',
		async ({ request }) => {
			await expect(expectNoncedPage(request, '/csp/fixed')).rejects.toThrow(
				/the nonce is the same on a second load/,
			);
		},
	);

	base('fails without a nonce in the policy', async ({ request }) => {
		await expect(expectNoncedPage(request, '/csp-none')).rejects.toThrow(
			/has no 'nonce-…'/,
		);
	});

	base('fails on a nonce shorter than 16 characters', async ({ request }) => {
		await expect(expectNoncedPage(request, '/csp/short')).rejects.toThrow(
			/has no 'nonce-…'/,
		);
	});

	base('fails when there is no tag to carry the nonce', async ({ request }) => {
		await expect(expectNoncedPage(request, '/csp/bare')).rejects.toThrow(
			/no <script>/,
		);
	});
});

cspTest('cspTest passes a clean page', async ({ page, cspViolations }) => {
	await page.goto('/csp/good');
	await expect(page).toHaveTitle('ran');
	expect(cspViolations).toEqual([]);
});

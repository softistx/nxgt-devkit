import { type APIRequestContext, expect } from '@playwright/test';
import { cspNonce, scriptSrcTemplate, scriptTags } from './policy';

export type LoadedPolicy = {
	/** The `content-security-policy` response header, `''` when absent. */
	policy: string;
	/** The nonce its `script-src` names. */
	nonce: string | undefined;
	html: string;
};

export type ExpectNoncedPageOptions = {
	/**
	 * The exact `script-src` value, with the nonce written `{nonce}`:
	 * `"'self' 'nonce-{nonce}' 'strict-dynamic'"`. Without it only the presence
	 * of a nonce is checked.
	 */
	scriptSrc?: string;
};

/** GETs `path` and reads its policy, the nonce it names and the HTML. */
export async function loadPolicy(
	request: APIRequestContext,
	path: string,
): Promise<LoadedPolicy> {
	const response = await request.get(path);
	const policy = response.headers()['content-security-policy'] ?? '';
	return { policy, nonce: cspNonce(policy), html: await response.text() };
}

/**
 * Loads `path` twice and checks that the policy names a nonce in `script-src`,
 * that every `<script>` and `<link rel="modulepreload">` carries it (and there
 * is at least one), and that a second load gets another nonce.
 */
export async function expectNoncedPage(
	request: APIRequestContext,
	path: string,
	options: ExpectNoncedPageOptions = {},
): Promise<void> {
	const first = await loadPolicy(request, path);
	const nonce = first.nonce;
	expect(
		nonce,
		`${path}: content-security-policy has no 'nonce-…' of 16+ base64 characters in script-src (policy: ${first.policy || 'none'})`,
	).toBeDefined();
	if (options.scriptSrc !== undefined) {
		expect(scriptSrcTemplate(first.policy), `${path}: script-src`).toBe(
			options.scriptSrc,
		);
	}
	const tags = scriptTags(first.html);
	expect(
		tags.length,
		`${path}: no <script> or <link rel="modulepreload"> to carry the nonce`,
	).toBeGreaterThan(0);
	const unnonced = tags.filter((tag) => tag.nonce !== nonce).map((t) => t.tag);
	expect(unnonced, `${path}: tags without the policy's nonce`).toEqual([]);
	const second = await loadPolicy(request, path);
	expect(
		second.nonce,
		`${path}: the nonce is the same on a second load`,
	).not.toBe(nonce);
}

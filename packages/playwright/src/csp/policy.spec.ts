import { describe, expect, test } from 'bun:test';
import { cspNonce, directive, scriptSrcTemplate, scriptTags } from './policy';
import { isCspError } from './watch';

const NONCE = 'aGVsbG8gd29ybGQgbm9uY2U';

describe('cspNonce', () => {
	test('reads the nonce of script-src, whatever the policy around it', () => {
		expect(
			cspNonce(
				`default-src 'self'; script-src 'self' 'nonce-${NONCE}' 'strict-dynamic'`,
			),
		).toBe(NONCE);
		expect(cspNonce(`script-src 'nonce-${NONCE}'`)).toBe(NONCE);
	});

	test('accepts base64 with padding and base64url, any length from 16', () => {
		expect(cspNonce("script-src 'nonce-AAAAAAAAAAAAAAAAAAAAAA=='")).toBe(
			'AAAAAAAAAAAAAAAAAAAAAA==',
		);
		expect(cspNonce("script-src 'nonce-ab_-cdefghijklmnop'")).toBe(
			'ab_-cdefghijklmnop',
		);
		expect(cspNonce(`script-src 'nonce-${'a'.repeat(43)}'`)).toBe(
			'a'.repeat(43),
		);
	});

	test('ignores a short nonce and a nonce in another directive', () => {
		expect(cspNonce("script-src 'nonce-short'")).toBeUndefined();
		expect(
			cspNonce(`style-src 'nonce-${NONCE}'; script-src 'self'`),
		).toBeUndefined();
		expect(cspNonce('')).toBeUndefined();
	});
});

describe('directive and scriptSrcTemplate', () => {
	test('finds a directive by name, case-insensitively', () => {
		expect(directive("Script-Src 'self'; img-src *", 'script-src')).toBe(
			"'self'",
		);
		expect(directive('img-src *', 'script-src')).toBeUndefined();
	});

	test('writes the nonce as a placeholder', () => {
		expect(
			scriptSrcTemplate(`script-src 'self' 'nonce-${NONCE}' 'strict-dynamic'`),
		).toBe("'self' 'nonce-{nonce}' 'strict-dynamic'");
	});
});

describe('scriptTags', () => {
	test('scripts and modulepreload links, with their nonce', () => {
		const tags = scriptTags(
			`<script nonce="a">1</script><SCRIPT src=x nonce='b'></SCRIPT>
<link rel="modulepreload" href="/m.js" nonce="c"><link rel="stylesheet" href="/s.css">
<link href="/n.js" rel="preload modulepreload"><script>2</script>`,
		);
		expect(tags.map((tag) => tag.nonce)).toEqual([
			'a',
			'b',
			'c',
			undefined,
			undefined,
		]);
	});
});

describe('isCspError', () => {
	test('matches Chromium and Firefox refusals', () => {
		expect(
			isCspError('Refused to execute inline script because it violates'),
		).toBe(true);
		expect(
			isCspError('Content-Security-Policy: The page’s settings blocked'),
		).toBe(true);
		expect(isCspError('An unrelated error')).toBe(false);
	});
});

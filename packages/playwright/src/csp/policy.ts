/** The value of one directive of a policy, `undefined` when it names none. */
export function directive(policy: string, name: string): string | undefined {
	for (const part of policy.split(';')) {
		const [head, ...rest] = part.trim().split(/\s+/);
		if (head?.toLowerCase() === name) return rest.join(' ');
	}
	return undefined;
}

// A base64 or base64url nonce of at least 16 characters, padded or not. The
// length an app generates is its own choice.
const NONCE = /'nonce-([A-Za-z0-9+/_-]{16,}={0,2})'/;

/** The policies of a header value: Playwright joins repeated headers with a newline. */
function policies(header: string): string[] {
	return header.split(/[,\n]/).map((policy) => policy.trim());
}

/**
 * The nonce the `script-src` of a policy names, `undefined` when it has no
 * `script-src` or no nonce of at least 16 base64 / base64url characters in it.
 * Only `script-src` is read, not `script-src-elem` nor `default-src`. Several
 * policies (repeated headers) are searched in turn.
 */
export function cspNonce(policy: string): string | undefined {
	for (const one of policies(policy)) {
		const nonce = NONCE.exec(directive(one, 'script-src') ?? '')?.[1];
		if (nonce) return nonce;
	}
	return undefined;
}

/** `script-src`'s value with its nonce replaced by `{nonce}`. */
export function scriptSrcTemplate(policy: string): string | undefined {
	const nonce = cspNonce(policy);
	for (const one of policies(policy)) {
		const value = directive(one, 'script-src');
		if (value === undefined) continue;
		if (nonce === undefined) return value;
		if (value.includes(`'nonce-${nonce}'`))
			return value.replace(`'nonce-${nonce}'`, "'nonce-{nonce}'");
	}
	return undefined;
}

export type ScriptTag = {
	/** The tag as written in the HTML. */
	tag: string;
	/** Its `nonce` attribute, `undefined` when it has none. */
	nonce: string | undefined;
};

// Quote-aware: a `>` inside an attribute value does not end the tag.
const TAGS = /<(script|link)\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi;
const COMMENTS = /<!--[\s\S]*?-->/g;
const ATTR = (name: string) =>
	new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');

function attribute(tag: string, name: string): string | undefined {
	const match = ATTR(name).exec(tag);
	return match ? (match[1] ?? match[2] ?? match[3]) : undefined;
}

/**
 * Every `<script>` and `<link rel="modulepreload">` of an HTML document, with
 * the nonce it carries, comments left out. Read from the raw HTML: a browser hides `nonce` from
 * the DOM.
 */
export function scriptTags(html: string): ScriptTag[] {
	const tags: ScriptTag[] = [];
	for (const m of html.replace(COMMENTS, '').matchAll(TAGS)) {
		const tag = m[0];
		const name = m[1];
		if (name?.toLowerCase() === 'link') {
			const rel = attribute(tag, 'rel') ?? '';
			if (!rel.toLowerCase().split(/\s+/).includes('modulepreload')) continue;
		}
		tags.push({ tag, nonce: attribute(tag, 'nonce') });
	}
	return tags;
}

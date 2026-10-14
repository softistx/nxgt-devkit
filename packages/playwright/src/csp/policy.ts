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

/**
 * The nonce a policy's `script-src` names, `undefined` when it has no
 * `script-src` or no nonce of at least 16 base64 / base64url characters in it.
 */
export function cspNonce(policy: string): string | undefined {
	return NONCE.exec(directive(policy, 'script-src') ?? '')?.[1];
}

/** `script-src`'s value with its nonce replaced by `{nonce}`. */
export function scriptSrcTemplate(policy: string): string | undefined {
	const value = directive(policy, 'script-src');
	const nonce = cspNonce(policy);
	return value === undefined || nonce === undefined
		? value
		: value.replace(`'nonce-${nonce}'`, "'nonce-{nonce}'");
}

export type ScriptTag = {
	/** The tag as written in the HTML. */
	tag: string;
	/** Its `nonce` attribute, `undefined` when it has none. */
	nonce: string | undefined;
};

const TAGS = /<(script|link)\b[^>]*>/gi;
const ATTR = (name: string) =>
	new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');

function attribute(tag: string, name: string): string | undefined {
	const match = ATTR(name).exec(tag);
	return match ? (match[1] ?? match[2] ?? match[3]) : undefined;
}

/**
 * Every `<script>` and `<link rel="modulepreload">` of an HTML document, with
 * the nonce it carries. Read from the raw HTML: a browser hides `nonce` from
 * the DOM.
 */
export function scriptTags(html: string): ScriptTag[] {
	const tags: ScriptTag[] = [];
	for (const [tag, name] of html
		.matchAll(TAGS)
		.map((m) => [m[0], m[1]] as const)) {
		if (name?.toLowerCase() === 'link') {
			const rel = attribute(tag, 'rel') ?? '';
			if (!rel.toLowerCase().split(/\s+/).includes('modulepreload')) continue;
		}
		tags.push({ tag, nonce: attribute(tag, 'nonce') });
	}
	return tags;
}

const ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&quot;': '"',
	'&#39;': "'",
	'&#x27;': "'",
	'&lt;': '<',
	'&gt;': '>',
};

/** Decodes the entities an HTML attribute carries: `&amp;`, a few named ones and numeric ones (`&#38;`, `&#x26;`). */
export function decodeEntities(text: string): string {
	return text.replace(
		/&(?:#x([0-9a-f]+)|#(\d+)|[a-z]+);/gi,
		(entity, hex?: string, dec?: string) => {
			if (hex === undefined && dec === undefined)
				return ENTITIES[entity.toLowerCase()] ?? entity;
			const code = hex === undefined ? Number(dec) : Number.parseInt(hex, 16);
			return Number.isInteger(code) && code >= 0 && code <= 0x10ffff
				? String.fromCodePoint(code)
				: entity;
		},
	);
}

/** Every link of a body: `href` values of the HTML, then bare URLs, in order. */
export function linksOf(html: string, text: string): string[] {
	const links: string[] = [];
	for (const m of html.matchAll(/href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
		links.push(decodeEntities((m[1] ?? m[2] ?? '').trim()));
	}
	for (const body of [html, text]) {
		for (const m of body.matchAll(/https?:\/\/[^\s"'<>)\]]+/gi)) {
			links.push(decodeEntities(m[0]).replace(/[.,;:!?]+$/, ''));
		}
	}
	return links;
}

/** The first link `match` accepts, made absolute against `base`; undefined if none. */
export function firstLink(
	html: string,
	text: string,
	match: RegExp,
	base: string,
): string | undefined {
	for (const link of linksOf(html, text)) {
		// A global or sticky RegExp keeps `lastIndex` between calls.
		match.lastIndex = 0;
		if (!match.test(link)) continue;
		try {
			return new URL(link, base).href;
		} catch {
			// not a URL once resolved: try the next one
		}
	}
	return undefined;
}

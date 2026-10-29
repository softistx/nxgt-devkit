const ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&quot;': '"',
	'&#39;': "'",
	'&#x27;': "'",
	'&lt;': '<',
	'&gt;': '>',
};

/** Decodes the few entities an HTML attribute carries, `&amp;` first among them. */
export function decodeEntities(text: string): string {
	return text.replace(
		/&(?:amp|quot|lt|gt|#39|#x27);/gi,
		(entity) => ENTITIES[entity.toLowerCase()] ?? entity,
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
			links.push(decodeEntities(m[0]));
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

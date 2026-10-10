/** The part of an axe violation the message is made of. */
export type ViolationSummary = {
	id: string;
	impact?: string | null;
	help: string;
	helpUrl: string;
	nodes: ReadonlyArray<{
		html: string;
		/** Frame by frame; a shadow DOM path is itself an array. */
		target: ReadonlyArray<string | readonly string[]>;
	}>;
};

export type FormatViolationsOptions = {
	/** The page the scan ran on, shown in the first line. */
	url?: string;
	/** The tags the scan ran with, shown in the first line. */
	tags?: readonly string[];
	/** Nodes shown per violation; the rest are counted. Default `3`. */
	maxNodes?: number;
};

const MAX_HTML = 200;

function selector(target: ViolationSummary['nodes'][number]['target']): string {
	return target
		.map((part) => (typeof part === 'string' ? part : part.join(' >>> ')))
		.join(' -> ');
}

function snippet(html: string): string {
	const line = html.replace(/\s+/g, ' ').trim();
	return line.length > MAX_HTML ? `${line.slice(0, MAX_HTML - 1)}…` : line;
}

/**
 * The failure message of `expectAccessible`: one block per violated rule, with
 * its impact, what to do, where to read more, and the first nodes it found.
 */
export function formatViolations(
	violations: readonly ViolationSummary[],
	{ url, tags, maxNodes = 3 }: FormatViolationsOptions = {},
): string {
	const count = violations.length;
	const lines = [
		`${count} accessibility violation${count === 1 ? '' : 's'}` +
			(url ? ` on ${url}` : '') +
			(tags?.length ? ` (${tags.join(', ')})` : '') +
			':',
	];
	violations.forEach((violation, i) => {
		lines.push(
			'',
			`${i + 1}. ${violation.id} [${violation.impact ?? 'unknown impact'}] ${violation.help}`,
			`   ${violation.helpUrl}`,
		);
		for (const node of violation.nodes.slice(0, maxNodes)) {
			lines.push(`   - ${selector(node.target)}`, `     ${snippet(node.html)}`);
		}
		const more = violation.nodes.length - maxNodes;
		if (more > 0) {
			lines.push(`   … and ${more} more node${more === 1 ? '' : 's'}`);
		}
	});
	return lines.join('\n');
}

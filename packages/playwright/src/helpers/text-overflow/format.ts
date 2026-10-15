import type { OverflowingText } from './types';

/** The failure message of `expectNoTextOverflow`. */
export function formatTextOverflow(
	found: readonly OverflowingText[],
	viewport: { width: number; height: number },
	max = 5,
): string {
	const n = found.length;
	const lines = [
		`Text overflows its box in ${n} element${n === 1 ? '' : 's'} (${viewport.width}x${viewport.height} viewport):`,
	];
	for (const f of found.slice(0, max)) {
		const what =
			f.kind === 'spills'
				? 'spills:'
				: `clipped${f.ellipsis ? ' with an ellipsis' : ''}, no title:`;
		const box = f.axis === 'y' ? `${f.boxWidth}px-tall` : `${f.boxWidth}px`;
		lines.push(
			`  - ${f.selector}  ${what} "${f.text}"  ${f.textWidth}px of text in a ${box} box`,
		);
	}
	if (n > max) lines.push(`  … and ${n - max} more`);
	lines.push(
		'Let the text wrap, give a clipped one its full text in a title or aria-label, or exclude it.',
	);
	return lines.join('\n');
}

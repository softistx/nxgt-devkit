import type { SmallTapTarget } from './types';

/** The failure message of `expectTapTargets`. */
export function formatTapTargets(
	found: readonly SmallTapTarget[],
	viewport: { width: number; height: number },
	{ size = 44, max = 5 }: { size?: number; max?: number } = {},
): string {
	const n = found.length;
	const lines = [
		`${n} tap target${n === 1 ? ' is' : 's are'} smaller than ${size}x${size}px (${viewport.width}x${viewport.height} viewport):`,
	];
	for (const f of found.slice(0, max)) {
		const name = f.name ? ` "${f.name}"` : '';
		const crowded = f.near ? `, too close to ${f.near}` : '';
		lines.push(`  - ${f.selector}${name}  ${f.width}x${f.height}px${crowded}`);
	}
	if (n > max) lines.push(`  … and ${n - max} more`);
	lines.push(
		`Make each at least ${size}x${size}px (padding or a ::after grows the tap area without moving the layout), or exclude it.`,
	);
	return lines.join('\n');
}

/**
 * A page path turned into a file name: `/projects/42?tab=a` → `projects-42`,
 * with `-<suffix>` appended when one is given. The root path is `index`.
 */
export function screenshotName(path: string, suffix?: string): string {
	const base =
		path
			.split('?')[0]
			?.split('#')[0]
			?.replace(/^\/+|\/+$/g, '')
			.replace(/\//g, '-') || 'index';
	return suffix ? `${base}-${suffix}` : base;
}

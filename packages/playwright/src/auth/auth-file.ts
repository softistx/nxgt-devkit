/** Where storage states live. Default of `authFile` and `authSetup`. */
export const DEFAULT_AUTH_DIR = 'playwright/.auth';

/** `authFile('admin')` → `playwright/.auth/admin.json`. */
export function authFile(account: string, dir = DEFAULT_AUTH_DIR): string {
	return `${dir}/${account}.json`;
}

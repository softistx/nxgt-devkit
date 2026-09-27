import { expect, test } from 'bun:test';
import { authFile } from './auth-file';

test('authFile names a storage state per account', () => {
	expect(authFile('admin')).toBe('playwright/.auth/admin.json');
	expect(authFile('user', 'e2e/.auth')).toBe('e2e/.auth/user.json');
});

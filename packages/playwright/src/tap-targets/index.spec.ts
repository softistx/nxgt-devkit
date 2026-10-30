import { expect, test } from 'bun:test';
import * as tapTargets from './index';

test('the subpath loads in Node and exports the verdict, with no browser global touched', () => {
	expect(typeof tapTargets.tapTargetVerdict).toBe('function');
});

test('the function is self-contained: its source reaches no import or outer helper', () => {
	const source = String(tapTargets.tapTargetVerdict);
	expect(source).not.toMatch(/\bimport\b|\brequire\(/);
	expect(source).not.toContain('__name');
});

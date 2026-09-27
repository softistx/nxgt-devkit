import { describe, expect, test } from 'bun:test';
import { screenshotName } from './screenshot-name';

describe('screenshotName', () => {
	test('turns a path into a slug', () => {
		expect(screenshotName('/projects/42')).toBe('projects-42');
	});
	test('drops the query and the hash', () => {
		expect(screenshotName('/a/b?tab=1#top')).toBe('a-b');
	});
	test('names the root index', () => {
		expect(screenshotName('/')).toBe('index');
	});
	test('appends a suffix', () => {
		expect(screenshotName('/auth/login', '01')).toBe('auth-login-01');
	});
});

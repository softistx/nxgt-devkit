import { describe, expect, test } from 'bun:test';
import { withScope } from '../scope';
import { clearScopedState, scoped } from '../scoped-state';
import { createMockState } from '../state';
import { createMockControl } from './index';

const server = { use() {}, resetHandlers() {} } as any;

function setup() {
	const students = scoped(() => new Map<string, string>());
	const control = createMockControl({
		server,
		state: createMockState(),
		reset: (ctx) => clearScopedState(ctx?.scope),
		scenarios: {
			add: (name: unknown, ctx) => {
				withScope(ctx?.scope, () => students.set(String(name), 'x'));
			},
		},
	});
	const names = (scope?: string) =>
		withScope(scope, () => [...students.keys()]);
	const seed = () => {
		for (const scope of ['a', 'b', undefined])
			withScope(scope, () => students.set('seed', 'x'));
	};
	return { control, names, seed };
}

describe('scoped state with the control', () => {
	test('a scoped reset empties that scope only', async () => {
		const { control, names, seed } = setup();
		seed();
		await control.scope('a').reset();
		expect(names('a')).toEqual([]);
		expect(names('b')).toEqual(['seed']);
		expect(names()).toEqual(['seed']);
	});

	test('a scenario through a scope writes into that scope', async () => {
		const { control, names, seed } = setup();
		seed();
		await control.scope('b').scenario('add', 'ada');
		expect(names('b')).toEqual(['seed', 'ada']);
		expect(names('a')).toEqual(['seed']);
		expect(names()).toEqual(['seed']);
	});

	test('an unscoped reset clears every scope', async () => {
		const { control, names, seed } = setup();
		seed();
		await control.scope('b').scenario('add', 'ada');
		await control.reset();
		expect(names('a')).toEqual([]);
		expect(names('b')).toEqual([]);
		expect(names()).toEqual([]);
	});
});

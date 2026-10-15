import { describe, expect, test } from 'bun:test';
import { parseOptions } from './options';

describe('parseOptions accepts', () => {
	test('the msw leg with its two versions', () => {
		expect(parseOptions(['2.12.10', '0.6.7'])).toEqual({
			leg: 'msw',
			msw: '2.12.10',
			mswPlaywright: '0.6.7',
		});
	});

	test('the msw leg with defaults when given nothing or one version', () => {
		expect(parseOptions([])).toEqual({
			leg: 'msw',
			msw: '2.12.10',
			mswPlaywright: '0.6.7',
		});
		expect(parseOptions(['2.13.0'])).toEqual({
			leg: 'msw',
			msw: '2.13.0',
			mswPlaywright: '0.6.7',
		});
	});

	test('--playwright 1.61.1', () => {
		expect(parseOptions(['--playwright', '1.61.1'])).toEqual({
			leg: 'playwright',
			playwright: '1.61.1',
			grep: undefined,
		});
	});

	test('--playwright 1.61.1 --grep x', () => {
		expect(parseOptions(['--playwright', '1.61.1', '--grep', 'x'])).toEqual({
			leg: 'playwright',
			playwright: '1.61.1',
			grep: 'x',
		});
	});

	test('--vitest 4.0.18 --storybook 10.3.6, with the default vite', () => {
		expect(
			parseOptions(['--vitest', '4.0.18', '--storybook', '10.3.6']),
		).toEqual({
			leg: 'storybook',
			vitest: '4.0.18',
			storybook: '10.3.6',
			vite: '7.3.7',
		});
	});

	test('the storybook leg with --vite, in any order', () => {
		expect(
			parseOptions([
				'--vite',
				'6.4.1',
				'--storybook',
				'10.3.6',
				'--vitest',
				'4.0.18',
			]),
		).toEqual({
			leg: 'storybook',
			vitest: '4.0.18',
			storybook: '10.3.6',
			vite: '6.4.1',
		});
	});
});

describe('parseOptions refuses', () => {
	test('--vitest without --storybook, and the reverse', () => {
		expect(() => parseOptions(['--vitest', '4.0.18'])).toThrow(
			'--vitest and --storybook go together',
		);
		expect(() => parseOptions(['--storybook', '10.3.6'])).toThrow(
			'--vitest and --storybook go together',
		);
	});

	test('--vite without --vitest', () => {
		expect(() => parseOptions(['--vite', '7.3.7'])).toThrow(
			'--vite goes with --vitest',
		);
	});

	test('--vitest with --playwright', () => {
		expect(() =>
			parseOptions([
				'--vitest',
				'4.0.18',
				'--storybook',
				'10.3.6',
				'--playwright',
				'1.61.1',
			]),
		).toThrow('--vitest and --playwright are separate legs');
	});

	test('--grep without --playwright', () => {
		expect(() => parseOptions(['--grep', 'x'])).toThrow(
			'--grep goes with --playwright',
		);
	});

	test('positional msw versions with --vitest or --playwright', () => {
		const positional = 'msw versions (positional) belong to the msw leg';
		expect(() =>
			parseOptions(['2.12.10', '--vitest', '4.0.18', '--storybook', '10.3.6']),
		).toThrow(positional);
		expect(() => parseOptions(['2.12.10', '--playwright', '1.61.1'])).toThrow(
			positional,
		);
	});

	test('an option without a value', () => {
		expect(() => parseOptions(['--playwright'])).toThrow(
			'--playwright needs a value',
		);
		expect(() => parseOptions(['--vitest', '4.0.18', '--storybook'])).toThrow(
			'--storybook needs a value',
		);
		expect(() => parseOptions(['--playwright', '1.61.1', '--grep'])).toThrow(
			'--grep needs a value',
		);
	});
});

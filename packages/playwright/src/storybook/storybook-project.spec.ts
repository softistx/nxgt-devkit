import { describe, expect, test } from 'bun:test';
import { storybookProject } from './index';
import { PREVIEW_CAPTURE_KEY } from './options';

describe('storybookProject', () => {
	test('renders every story, capturing nothing', () => {
		const project = storybookProject();
		expect(project.test?.name).toBe('storybook');
		expect(project.test?.provide).toEqual({ [PREVIEW_CAPTURE_KEY]: false });
		expect(project.test?.browser?.enabled).toBe(true);
		expect(project.test?.setupFiles?.[0]).toEndWith('/setup.js');
	});

	test('capture: its own project, the capture options provided to the browser', () => {
		const project = storybookProject({ capture: { dir: 'docs/img' } });
		expect(project.test?.name).toBe('previews');
		expect(project.test?.provide).toEqual({
			[PREVIEW_CAPTURE_KEY]: { dir: 'docs/img' },
		});
	});

	const launchPath = (instance?: { provider?: unknown }) =>
		(
			instance?.provider as {
				options?: { launchOptions?: { executablePath?: string } };
			}
		)?.options?.launchOptions?.executablePath;

	test('runs in Chromium only by default', () => {
		const project = storybookProject();
		expect(project.test?.browser?.instances).toEqual([{ browser: 'chromium' }]);
	});

	test('browsers: one instance each, in order, duplicates dropped', () => {
		const project = storybookProject({
			browsers: ['chromium', 'firefox', 'webkit', 'firefox'],
		});
		expect(project.test?.browser?.instances).toEqual([
			{ browser: 'chromium' },
			{ browser: 'firefox' },
			{ browser: 'webkit' },
		]);
	});

	test('an empty list of browsers throws', () => {
		expect(() => storybookProject({ browsers: [] })).toThrow(
			'storybookProject: `browsers` is empty.',
		);
	});

	test('a system Chromium from the environment', () => {
		process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = '/usr/bin/chromium';
		const project = storybookProject();
		delete process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
		expect(launchPath(project.test?.browser?.instances?.[0])).toBe(
			'/usr/bin/chromium',
		);
	});

	test('executablePath goes on the chromium instance only', () => {
		const project = storybookProject({
			browsers: ['firefox', 'chromium', 'webkit'],
			executablePath: '/opt/chromium',
		});
		const [firefox, chromium, webkit] = project.test?.browser?.instances ?? [];
		expect(launchPath(chromium)).toBe('/opt/chromium');
		expect(firefox).toEqual({ browser: 'firefox' });
		expect(webkit).toEqual({ browser: 'webkit' });
		expect(launchPath(project.test?.browser as { provider?: unknown })).toBe(
			undefined,
		);
	});

	test('capture with more than one browser throws; one browser is fine', () => {
		expect(() =>
			storybookProject({ capture: true, browsers: ['chromium', 'firefox'] }),
		).toThrow(
			'`capture` needs a single browser but `browsers` is [chromium, firefox]',
		);
		expect(() =>
			storybookProject({ capture: true, browsers: ['firefox', 'firefox'] }),
		).not.toThrow();
		expect(() =>
			storybookProject({ browsers: ['chromium', 'firefox'] }),
		).not.toThrow();
	});

	test('executablePath without chromium throws; the environment variable is ignored', () => {
		expect(() =>
			storybookProject({ browsers: ['firefox'], executablePath: '/opt/c' }),
		).toThrow(
			'`executablePath` is a Chromium binary but `browsers` is [firefox]',
		);
		process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = '/usr/bin/chromium';
		const project = storybookProject({ browsers: ['firefox'] });
		delete process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
		expect(project.test?.browser?.instances).toEqual([{ browser: 'firefox' }]);
	});
});

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

	test('a system Chromium from the environment', () => {
		process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = '/usr/bin/chromium';
		const project = storybookProject();
		delete process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
		const provider = project.test?.browser?.provider as {
			options?: { launchOptions?: { executablePath?: string } };
		};
		expect(provider.options?.launchOptions?.executablePath).toBe(
			'/usr/bin/chromium',
		);
	});
});

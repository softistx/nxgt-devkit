import { storybookProject } from '@nxgt/playwright/storybook';
import { defineConfig } from 'vitest/config';

type Browser = 'chromium' | 'firefox' | 'webkit';
const browsers = (process.env.STORYBOOK_BROWSERS?.split(',') ?? [
	'chromium',
]) as Browser[];

export default defineConfig({
	test: {
		projects: [
			storybookProject({
				browsers,
				tags: { exclude: ['expected-failure'] },
			}),
			storybookProject({
				name: 'expected-failure',
				browsers,
				tags: { include: ['expected-failure'] },
			}),
			storybookProject({
				browsers: ['chromium'],
				capture: { dir: '.probe-previews', settle: 0 },
			}),
		],
	},
});

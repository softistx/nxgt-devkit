import { storybookProject } from '@nxgt/playwright/storybook';
import { defineConfig } from 'vitest/config';
import { captureBrowser, fixtureBrowsers } from './browsers';

const browsers = fixtureBrowsers();
const capturing = captureBrowser(browsers);

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
			// One browser that encodes WebP (WebKit cannot): chromium, else
			// firefox. Left out when the run names neither, so it never needs a
			// browser the run lacks.
			...(capturing
				? [
						storybookProject({
							browsers: [capturing],
							capture: { dir: '.probe-previews', settle: 0 },
						}),
					]
				: []),
		],
	},
});

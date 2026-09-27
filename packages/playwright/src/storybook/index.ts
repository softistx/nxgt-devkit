import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import type { TestProjectInlineConfiguration } from 'vitest/config';
import { PREVIEW_CAPTURE_KEY, type PreviewCaptureOptions } from './options';

export { componentId, titleToComponentId } from './component-id';
export type { PreviewCaptureOptions } from './options';

export type StorybookProjectOptions = {
	/** The Vitest project name. Default `storybook`, or `previews` with `capture`. */
	name?: string;
	/** Default `.storybook`. */
	configDir?: string;
	/** Filter stories by tag, as `storybookTest` does. */
	tags?: { include?: string[]; exclude?: string[]; skip?: string[] };
	/**
	 * Screenshot the stories carrying the capture tag into WebP previews. Only
	 * those stories run. Default `false`: every story renders as a smoke test.
	 */
	capture?: boolean | PreviewCaptureOptions;
	/** Default `{ width: 1280, height: 800 }`. */
	viewport?: { width: number; height: number };
	/**
	 * A Chromium to launch instead of Playwright's download. Default
	 * `$PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` — set it on a distribution
	 * Playwright does not support (Arch, Manjaro), e.g. `/usr/bin/chromium`.
	 */
	executablePath?: string;
	/** Setup files run after this package's own. */
	setupFiles?: string[];
};

/**
 * A Vitest project that renders every Storybook story in Chromium, through
 * `@storybook/addon-vitest`. Put it in `test.projects`; `extends: true` keeps
 * the root config's plugins (the framework's, Tailwind's):
 *
 * ```ts
 * test: {
 * 	projects: [
 * 		{ extends: true, test: { name: 'unit', environment: 'node' } },
 * 		storybookProject(),
 * 		storybookProject({ capture: true }),
 * 	],
 * }
 * ```
 */
export function storybookProject(
	options: StorybookProjectOptions = {},
): TestProjectInlineConfiguration {
	const capture: PreviewCaptureOptions | false =
		options.capture === true ? {} : (options.capture ?? false);
	const tags = capture
		? {
				...options.tags,
				include: [...(options.tags?.include ?? []), capture.tag ?? 'preview'],
			}
		: options.tags;

	return {
		extends: true,
		plugins: [
			storybookTest({ configDir: options.configDir ?? '.storybook', tags }),
		],
		test: {
			name: options.name ?? (capture ? 'previews' : 'storybook'),
			provide: { [PREVIEW_CAPTURE_KEY]: capture },
			setupFiles: [
				fileURLToPath(new URL('./setup.js', import.meta.url)),
				...(options.setupFiles ?? []),
			],
			browser: {
				enabled: true,
				headless: true,
				provider: playwright({
					launchOptions: {
						executablePath:
							options.executablePath ??
							process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
					},
				}),
				instances: [{ browser: 'chromium' }],
				viewport: options.viewport ?? { width: 1280, height: 800 },
			},
		},
	};
}

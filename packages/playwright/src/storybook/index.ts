import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import type { TestProjectInlineConfiguration } from 'vitest/config';
import { PREVIEW_CAPTURE_KEY, type PreviewCaptureOptions } from './options';

export { componentId, titleToComponentId } from './component-id';
export type { PreviewCaptureOptions, StoryPreviewParameters } from './options';

/** The browsers Vitest's Playwright provider can launch. */
export type StorybookBrowser = 'chromium' | 'firefox' | 'webkit';

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
	 * Throws with more than one of `browsers` (they would write the same
	 * file) and with `webkit` (it cannot encode WebP).
	 */
	capture?: boolean | PreviewCaptureOptions;
	/** Default `{ width: 1280, height: 800 }`. */
	viewport?: { width: number; height: number };
	/**
	 * The browsers every story runs in, one Vitest browser instance each.
	 * Default `['chromium']`. Duplicates are ignored.
	 */
	browsers?: StorybookBrowser[];
	/**
	 * A Chromium to launch instead of Playwright's download. Default
	 * `$PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` — set it on a distribution
	 * Playwright does not support (Arch, Manjaro), e.g. `/usr/bin/chromium`.
	 * It applies to the `chromium` instance only; Firefox and WebKit always use
	 * Playwright's downloads. Setting this option while `browsers` has no
	 * `chromium` throws (the environment variable is then ignored).
	 */
	executablePath?: string;
	/** Setup files run after this package's own. */
	setupFiles?: string[];
};

/**
 * A Vitest project that renders every Storybook story in Chromium (or the `browsers` you name), through
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
	const browsers: StorybookBrowser[] = [
		...new Set(options.browsers ?? (['chromium'] as const)),
	];
	if (browsers.length === 0) {
		throw new Error(
			'storybookProject: `browsers` is empty. Name at least one of chromium, firefox, webkit.',
		);
	}
	if (options.executablePath && !browsers.includes('chromium')) {
		throw new Error(
			`storybookProject: \`executablePath\` is a Chromium binary but \`browsers\` is [${browsers.join(', ')}]. Add 'chromium' or drop \`executablePath\`.`,
		);
	}
	if (options.capture && browsers.includes('webkit')) {
		throw new Error(
			`storybookProject: \`capture\` cannot use 'webkit' (\`browsers\` is [${browsers.join(', ')}]): WebKit cannot encode WebP previews. Capture with chromium or firefox.`,
		);
	}
	if (options.capture && browsers.length > 1) {
		throw new Error(
			`storybookProject: \`capture\` needs a single browser but \`browsers\` is [${browsers.join(', ')}]. Every browser writes the same preview file; name one.`,
		);
	}
	const executablePath =
		options.executablePath ?? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
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
				provider: playwright(),
				// A provider's launchOptions would reach every instance, and a
				// Chromium path breaks Firefox: it goes on the chromium instance.
				instances: browsers.map((browser) =>
					browser === 'chromium' && executablePath
						? {
								browser,
								provider: playwright({ launchOptions: { executablePath } }),
							}
						: { browser },
				),
				viewport: options.viewport ?? { width: 1280, height: 800 },
			},
		},
	};
}

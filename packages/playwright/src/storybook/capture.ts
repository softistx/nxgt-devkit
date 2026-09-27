import { inject, type TestContext } from 'vitest';
import { commands, page } from 'vitest/browser';
import { componentId } from './component-id';
import { PREVIEW_CAPTURE_KEY, type StoryPreviewParameters } from './options';
import { paintedBox } from './painted-box';
import { toWebp } from './to-webp';

export { componentId, titleToComponentId } from './component-id';
export type { PreviewCaptureOptions, StoryPreviewParameters } from './options';

type StoryContext = TestContext & {
	story?: {
		id: string;
		tags: string[];
		parameters?: { previewCapture?: StoryPreviewParameters };
	};
};

/**
 * An `afterEach` for `@storybook/addon-vitest`: screenshots the story, crops it
 * to what is painted, and writes `<dir>/<component id>.webp`. Does nothing
 * unless the project was made with `storybookProject({ capture })` and the
 * story carries the capture tag. **Browser only.**
 */
export async function capturePreview(context: TestContext): Promise<void> {
	const options = inject(PREVIEW_CAPTURE_KEY);
	const { story } = context as StoryContext;
	if (!options || !story?.tags.includes(options.tag ?? 'preview')) return;

	const width = story.parameters?.previewCapture?.width;
	if (width) document.body.style.width = `${width}px`;

	await document.fonts.ready;
	await new Promise((resolve) => setTimeout(resolve, options.settle ?? 600));

	// With `save: false` the screenshot comes back as the base64 string itself.
	const png = await page.screenshot({ element: document.body, save: false });
	const webp = await toWebp(png, paintedBox(), {
		padding: options.padding ?? 24,
		maxWidth: options.maxWidth ?? 960,
		quality: options.quality ?? 0.82,
	});
	document.body.style.width = '';
	// `commands.writeFile` resolves against the project root.
	await commands.writeFile(
		`${options.dir ?? 'docs/previews'}/${componentId(story.id)}.webp`,
		webp,
		'base64',
	);
}

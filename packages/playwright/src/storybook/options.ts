/** What the `previews` project hands the browser, through Vitest's `provide`. */
export type PreviewCaptureOptions = {
	/** Relative to the project root. Default `docs/previews`. */
	dir?: string;
	/** Only stories carrying this tag are captured. Default `preview`. */
	tag?: string;
	/** Space kept around what is painted, in CSS px. Default `24`. */
	padding?: number;
	/** Wider captures are scaled down. Default `960`. */
	maxWidth?: number;
	/** WebP quality, 0–1. Default `0.82`. */
	quality?: number;
	/** Wait after fonts are ready, for animations and lazy content. Default `600`. */
	settle?: number;
};

/**
 * Per story, under `parameters.previewCapture`. A component that stretches to
 * its container — a field, a table, a toolbar — is otherwise captured as wide
 * as the 1280px viewport.
 */
export type StoryPreviewParameters = {
	/** Lay the story out in a container this many CSS px wide. */
	width?: number;
};

export const PREVIEW_CAPTURE_KEY = 'nxgtPreviewCapture';

declare module 'vitest' {
	export interface ProvidedContext {
		[PREVIEW_CAPTURE_KEY]: PreviewCaptureOptions | false;
	}
}

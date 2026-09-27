/**
 * Storybook's own id for a story's title — the story id without its
 * `--<story>` part: `form-fields-textfield` for any story titled
 * `Form fields/TextField`. The name a preview is saved under.
 */
export function componentId(storyId: string): string {
	return storyId.split('--')[0] ?? storyId;
}

/**
 * The id Storybook derives from a title, for code that has a title and no
 * story: lowercase, every run of other characters one `-`.
 */
export function titleToComponentId(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

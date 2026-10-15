/** A text that does not fit the box that holds it. */
export type OverflowingText = {
	/** The box (`tag#id.class`), enough to find it in the inspector. */
	selector: string;
	/** The text, its first 40 characters, ellipsised when longer. */
	text: string;
	/**
	 * `clipped`: the box hides what does not fit (`overflow: hidden` or
	 * `clip`, which `text-overflow: ellipsis` and a line clamp need) and gives
	 * the full text nowhere (no `title`, no `aria-label`). `spills`: the box
	 * leaves it visible, so it runs over its surroundings.
	 */
	kind: 'clipped' | 'spills';
	/** The box ends the clipped text with an ellipsis (`text-overflow`, a line clamp). */
	ellipsis: boolean;
	/** The text's extent along `axis`, in CSS pixels. */
	textWidth: number;
	/** The box's extent along `axis`, in CSS pixels. */
	boxWidth: number;
	/** `x`: too wide for the box. `y`: too many lines for its height. */
	axis: 'x' | 'y';
};

export type TextOverflowOptions = {
	/**
	 * Where to look: a selector or a list of them. Default the whole `body`.
	 */
	include?: string | readonly string[];
	/** Boxes to leave out, with everything inside them. */
	exclude?: string | readonly string[];
	/** How many offending boxes the message lists. Default `5`. */
	max?: number;
};

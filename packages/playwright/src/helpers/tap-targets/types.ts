/** A tap target as the page shows it: its box, in CSS pixels. */
export type TapTargetBox = {
	/** `tag#id.class`, enough to find it in the inspector. */
	selector: string;
	/** What a person would call it: its label, text, `alt` or `title`, first 40 characters. */
	name: string;
	left: number;
	top: number;
	width: number;
	height: number;
};

/** A tap target that is too small, or too close to another one. */
export type SmallTapTarget = {
	selector: string;
	name: string;
	/** The target's width in CSS pixels, rounded. */
	width: number;
	/** The target's height in CSS pixels, rounded. */
	height: number;
	/**
	 * With `spacing`: the target that crowds this one (`tag#id.class`), the
	 * reason an undersized target did not get the spacing exception.
	 */
	near?: string;
};

export type TapTargetOptions = {
	/**
	 * The side of the square a target must fill, in CSS pixels. Default `44`,
	 * the size of a comfortable touch target. WCAG 2.5.8's 24px minimum is
	 * axe's `target-size` rule, which `expectAccessible` already runs.
	 */
	size?: number;
	/**
	 * Let a target smaller than `size` pass when a circle of `size` diameter
	 * centred on it touches no other target and no other undersized target's
	 * circle (WCAG 2.5.8's spacing exception, at this `size`). Default `false`.
	 */
	spacing?: boolean;
	/**
	 * Which elements are tap targets: a selector or a list of them.
	 * Default `DEFAULT_TAP_TARGETS`; this replaces it, so spread it to add.
	 */
	targets?: string | readonly string[];
	/** Where to look: a selector or a list of them. Default the whole document. */
	include?: string | readonly string[];
	/** Targets to leave out, with everything inside them. */
	exclude?: string | readonly string[];
	/** How many offending targets the message lists. Default `5`. */
	max?: number;
};

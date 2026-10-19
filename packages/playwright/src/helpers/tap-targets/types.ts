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
	/**
	 * Set by `probeHitAreas` when the box is smaller than `size` but an
	 * invisible hit area (a `::before` / `::after`; a checkbox's or radio's
	 * label counts) covers the `size` square centred on the box: the judge
	 * counts it as large enough.
	 */
	hitArea?: true;
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
	 * Measure the real hit area, not only the visible box. Only a candidate is
	 * probed: a target smaller than `size` that has a `::before` / `::after`
	 * with content (on it, on a checkbox's or radio's label, or on a
	 * descendant), a descendant drawn outside its box, or a custom element or
	 * shadow root (as the target, inside it, or in a checkbox's or radio's
	 * label). Any other is judged on its box, which is what it hit-tests as. A
	 * candidate still passes when a `size` square centred on its box (with its
	 * labels, for a checkbox or radio) is hit by the target itself, its
	 * descendants (a `::before` / `::after` counts as the element) or, for a
	 * checkbox or radio, its labels: the design system that draws a 20px
	 * checkbox with an invisible 44px `::before`. The square is probed with
	 * `document.elementFromPoint` on a 5x5 grid, so the pseudo-element must be
	 * hit-testable (not `pointer-events: none`, not covered by a neighbour; a
	 * floating layer, by its role or an open popover or dialog, positioned or
	 * in the top layer, is measured through: made transparent to the pointer
	 * for the probe; an in-flow neighbour still fails). A target off
	 * screen or covered where it sits is scrolled into view for the probe and
	 * the scroll positions are restored. Any undersized target that another
	 * element still covers there, at the centre of each of its boxes and its
	 * labels' (a toast, a modal layer, the front toast of a stack), is out of
	 * reach in that state and not judged.
	 * Default `true`; `false` judges the visible box only, as 0.8 did.
	 */
	hitArea?: boolean;
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

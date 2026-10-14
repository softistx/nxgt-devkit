import type { Page } from '@playwright/test';

type Saved = {
	/** Scans in progress on this page: the last one out restores. */
	depth: number;
	elements: [element: HTMLElement, value: string, priority: string][];
};

// Both functions run in the page, so they cannot share a constant with the
// module: each spells the key out.

/**
 * Puts every matching element back in the flow. Returns whether the page was
 * touched, so a scan that matched nothing leaves no trace. An overlapping scan
 * on the same page joins the saved list instead of saving the first one's
 * `static` as the original.
 */
function putInFlow(selectors: string[]): boolean {
	const key = Symbol.for('@nxgt/playwright/a11y/unstick');
	const w = window as unknown as Record<symbol, Saved | undefined>;
	const saved = w[key] ?? { depth: 0, elements: [] };
	const known = new Set(saved.elements.map(([element]) => element));
	const matched = document.querySelectorAll<HTMLElement>(selectors.join(','));
	if (matched.length === 0 && saved.depth === 0) return false;
	for (const element of matched) {
		if (known.has(element)) continue;
		const { style } = element;
		saved.elements.push([
			element,
			style.getPropertyValue('position'),
			style.getPropertyPriority('position'),
		]);
		style.setProperty('position', 'static', 'important');
	}
	saved.depth++;
	w[key] = saved;
	return true;
}

/** Gives back exactly the inline `position` each element had, once the last scan is done. */
function restore(): void {
	const key = Symbol.for('@nxgt/playwright/a11y/unstick');
	const w = window as unknown as Record<symbol, Saved | undefined>;
	const saved = w[key];
	if (!saved || --saved.depth > 0) return;
	for (const [element, value, priority] of saved.elements) {
		if (value === '') element.style.removeProperty('position');
		else element.style.setProperty('position', value, priority);
	}
	delete w[key];
}

/**
 * Runs `run` with the sticky or fixed overlays matching `selectors` put back
 * in the flow (`position: static`), then restores their inline `position`,
 * even when `run` throws. Top document only: a bar inside an iframe or a
 * shadow root is not reached. The page is not touched when nothing matches.
 */
export async function withOverlaysInFlow<T>(
	page: Page,
	selectors: readonly string[],
	run: () => Promise<T>,
): Promise<T> {
	const valid = selectors.filter((selector) => selector.trim() !== '');
	if (valid.length === 0) return run();
	const touched = await page.evaluate(putInFlow, valid);
	try {
		return await run();
	} finally {
		// A page closed mid-scan has nothing left to restore, and its error
		// must not replace axe's.
		if (touched) await page.evaluate(restore).catch(() => {});
	}
}

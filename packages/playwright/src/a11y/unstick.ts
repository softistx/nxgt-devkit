import type { Page } from '@playwright/test';

type Saved = [element: HTMLElement, value: string, priority: string][];

// Both functions run in the page, so they cannot share a constant with the
// module: each spells the key out.

/** Puts every matching element back in the flow; returns how many matched. */
function putInFlow(selectors: string[]): number {
	const saved: Saved = [];
	for (const element of document.querySelectorAll<HTMLElement>(
		selectors.join(','),
	)) {
		const { style } = element;
		saved.push([
			element,
			style.getPropertyValue('position'),
			style.getPropertyPriority('position'),
		]);
		style.setProperty('position', 'static', 'important');
	}
	const key = Symbol.for('@nxgt/playwright/a11y/unstick');
	(window as unknown as Record<symbol, Saved>)[key] = saved;
	return saved.length;
}

/** Gives back exactly the inline `position` each element had. */
function restore(): void {
	const key = Symbol.for('@nxgt/playwright/a11y/unstick');
	const w = window as unknown as Record<symbol, Saved | undefined>;
	for (const [element, value, priority] of w[key] ?? []) {
		if (value === '') element.style.removeProperty('position');
		else element.style.setProperty('position', value, priority);
	}
	delete w[key];
}

/**
 * Runs `run` with the sticky or fixed overlays matching `selectors` put back
 * in the flow (`position: static`), then restores their inline `position`,
 * even when `run` throws. The page is not touched for no selector, and not
 * restored when nothing matched.
 */
export async function withOverlaysInFlow<T>(
	page: Page,
	selectors: readonly string[],
	run: () => Promise<T>,
): Promise<T> {
	if (selectors.length === 0) return run();
	const matched = await page.evaluate(putInFlow, [...selectors]);
	try {
		return await run();
	} finally {
		if (matched > 0) await page.evaluate(restore);
	}
}

import { expect, type Locator } from '@playwright/test';
import type { HydrationMarker } from '../helpers/hydration';

/**
 * The hydration marker of a React Router app (framework or data mode) that
 * renders the whole document: the client router exists and React has
 * attached itself to `<body>`. Needs nothing from the app.
 *
 * ```ts
 * export const test = withHydration(base, { marker: reactRouterHydrated });
 * ```
 */
export const reactRouterHydrated: HydrationMarker = () =>
	'__reactRouterDataRouter' in window &&
	Object.keys(document.body).some((key) => key.startsWith('__reactFiber'));

/**
 * Resolves once React has hydrated one element — its props are attached, so
 * its handlers run. For an element shown after the page's own hydration (a
 * dialog's button, a lazy route's form): a click before that posts a form
 * natively, or does nothing.
 */
export async function elementHydrated(
	locator: Locator,
	{ timeout }: { timeout?: number } = {},
): Promise<void> {
	await expect
		.poll(
			() =>
				locator.evaluate((element) =>
					Object.keys(element).some((key) => key.startsWith('__reactProps')),
				),
			{
				message: 'React never attached its props to this element',
				...(timeout === undefined ? {} : { timeout }),
			},
		)
		.toBe(true);
}

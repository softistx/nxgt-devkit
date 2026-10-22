import type { Page } from '@playwright/test';

/**
 * Resolves after `count` animation frames (default `2`). After a render, the
 * first frame commits it and the second has run the effects it scheduled:
 * a layout a component settles in an effect (a toolbar that collapses on a
 * phone, a menu placed against its trigger) is in place.
 */
export async function nextFrames(page: Page, count = 2): Promise<void> {
	await page.evaluate(
		(count) =>
			new Promise<void>((resolve) => {
				const step = (left: number) =>
					left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1));
				step(count);
			}),
		count,
	);
}

/**
 * Resolves once the active view transition, if any, has finished, and every
 * CSS animation, CSS transition and Web Animation running in the document
 * that has an end has ended. An infinite one (a spinner) is left running; a
 * cancelled one counts as ended.
 *
 * A view transition creates its `::view-transition-*` animations only once
 * its update callback has resolved (a framework rendering the new state), so
 * it is awaited through `document.activeViewTransition`, where the browser
 * exposes it. One that starts while the animations end is awaited in turn.
 *
 * Check a page at rest: an axe scan half-way through a fade reads colours
 * never shown, and a screenshot catches a box mid-slide.
 */
export async function settled(page: Page): Promise<void> {
	await page.evaluate(async () => {
		const active = () =>
			(
				document as Document & {
					activeViewTransition?: {
						finished: Promise<void>;
						ready: Promise<void>;
					} | null;
				}
			).activeViewTransition ?? null;
		const animations = () =>
			Promise.all(
				document
					.getAnimations()
					.filter((animation) => {
						const end = animation.effect?.getComputedTiming().endTime;
						return typeof end === 'number' && Number.isFinite(end);
					})
					.map((animation) => animation.finished.catch(() => undefined)),
			);
		// Bounded: a page that chains transitions for ever still resolves.
		for (let round = 0; round < 10; round++) {
			// `finished` never settles for a transition the browser aborts (an
			// update callback that never resolves, ~4s): its rejected `ready`
			// ends the wait.
			const transition = active();
			if (transition) {
				await Promise.race([
					transition.finished,
					transition.ready.then(
						() => transition.finished,
						() => undefined,
					),
				]).catch(() => undefined);
			}
			await animations();
			if (!active()) return;
		}
	});
}

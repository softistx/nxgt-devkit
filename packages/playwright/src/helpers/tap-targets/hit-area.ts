import { tapTargetVerdict } from '../../tap-targets/verdict';
import type { Measured } from './measure';

/**
 * Probes the undersized tap targets `measure` listed: whether a pointer
 * reaches them at all, and, for those that could have an invisible hit area,
 * whether it fills the `size` square.
 *
 * Meant for `handle.evaluate<Probed>(probeHitAreas, { size, tolerance })` on
 * the handle `page.evaluateHandle(measure, …)` returned: it receives the
 * elements `measure` selected (`result.elements`; `result.data.undersized`
 * the positions to probe) and never selects again, so the page changing
 * between the two calls cannot make it test another element. One that is no
 * longer connected is skipped, and gets neither verdict.
 *
 * It is the SOURCE of an in-page function (a string Playwright evaluates),
 * built around `tapTargetVerdict`'s own source: the check and the
 * `@nxgt/playwright/tap-targets` export are one piece of logic. Each
 * undersized target gets the verdict of `tapTargetVerdict`; see there for
 * the probe (5x5 grid inset 1px, floating layers measured through, scroll to
 * the middle and put back). `enlarged`: the indices whose `size` square is
 * hit. `covered`: the indices another element still covers once scrolled to
 * the middle: no pointer reaches them in this state.
 */
const source = `async (result, args) => {
	const verdict = ${tapTargetVerdict.toString()};
	const memo = { still: new Set(), idle: 0 };
	const enlarged = [];
	const covered = [];
	for (const i of result.data.undersized) {
		const el = result.elements[i];
		if (!el || !el.isConnected) continue;
		const r = await verdict(el, { size: args.size, tolerance: args.tolerance, memo });
		if (r.verdict === 'enlarged') enlarged.push(i);
		if (r.verdict === 'covered') covered.push(i);
	}
	return { enlarged, covered };
}`;

export type Probed = { enlarged: number[]; covered: number[] };

/**
 * A function made from `source`, so Playwright serialises it with its
 * `toString()` like `measure`: the verdict's source is inside it.
 */
export const probeHitAreas = new Function(`return ${source}`)() as (
	result: Measured,
	args: { size: number; tolerance: number },
) => Promise<Probed>;

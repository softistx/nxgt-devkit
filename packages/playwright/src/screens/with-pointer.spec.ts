import { describe, expect, test } from 'bun:test';
import type { Page } from '@playwright/test';
import { checkScreen } from './check-screen';
import { reapplyPointer, withPointer } from './with-pointer';

/** A page whose context records the CDP calls and the order of events. */
function fakePage(
	engine: string | null = 'chromium',
	failDetach = false,
	touchPoints = 0,
	failDisable = false,
) {
	const log: string[] = [];
	const cdp = {
		send: async (method: string, params: unknown) => {
			log.push(`${method} ${JSON.stringify(params)}`);
			if (failDisable && JSON.stringify(params) === '{"enabled":false}')
				throw new Error('target closed');
		},
		detach: async () => {
			log.push('detach');
			if (failDetach) throw new Error('gone');
		},
	};
	const page = {
		context: () => ({
			browser: () =>
				engine === null
					? null
					: { browserType: () => ({ name: () => engine }) },
			newCDPSession: async () => {
				log.push('session');
				return cdp;
			},
		}),
		evaluate: async () => touchPoints,
	};
	return { page: page as unknown as Page, log };
}

const ON =
	'Emulation.setTouchEmulationEnabled {"enabled":true,"maxTouchPoints":5}';
const OFF = 'Emulation.setTouchEmulationEnabled {"enabled":false}';

describe('reapplyPointer', () => {
	test('re-enables touch inside a coarse run, and does nothing outside', async () => {
		const { page, log } = fakePage();
		await reapplyPointer(page);
		expect(log).toEqual([]);
		await withPointer(page, 'coarse', async () => {
			log.length = 0;
			await reapplyPointer(page);
			expect(log).toEqual([ON]);
		});
		log.length = 0;
		await reapplyPointer(page);
		expect(log).toEqual([]);
	});
});

describe('withPointer', () => {
	test('coarse enables touch emulation around the run, then disables and detaches', async () => {
		const { page, log } = fakePage();
		const result = await withPointer(page, 'coarse', async () => {
			log.push('run');
			return 42;
		});
		expect(result).toBe(42);
		expect(log).toEqual(['session', ON, 'run', OFF, 'detach']);
	});

	test('disables and detaches when the run throws', async () => {
		const { page, log } = fakePage();
		await expect(
			withPointer(page, 'coarse', async () => {
				throw new Error('check failed');
			}),
		).rejects.toThrow('check failed');
		expect(log.slice(-2)).toEqual([OFF, 'detach']);
	});

	test('a detach that fails does not hide the check result', async () => {
		const { page } = fakePage('chromium', true);
		expect(await withPointer(page, 'coarse', async () => 1)).toBe(1);
	});

	test('a page that already has touch is left alone', async () => {
		const { page, log } = fakePage('chromium', false, 5);
		expect(await withPointer(page, 'coarse', async () => 1)).toBe(1);
		expect(log).toEqual([]);
	});

	test('a disable that rejects does not mask the run error', async () => {
		const { page, log } = fakePage('chromium', false, 0, true);
		await expect(
			withPointer(page, 'coarse', async () => {
				throw new Error('check failed');
			}),
		).rejects.toThrow('check failed');
		expect(log.at(-1)).toBe('detach');
	});

	test('fine and no pointer only run', async () => {
		const { page, log } = fakePage();
		await withPointer(page, 'fine', async () => 1);
		await withPointer(page, undefined, async () => 1);
		expect(log).toEqual([]);
	});

	test('firefox and webkit throw a clear error before running', async () => {
		for (const engine of ['firefox', 'webkit']) {
			const { page, log } = fakePage(engine);
			let ran = false;
			await expect(
				withPointer(page, 'coarse', async () => {
					ran = true;
				}),
			).rejects.toThrow(`needs Chromium`);
			expect(ran).toBe(false);
			expect(log).toEqual([]);
		}
	});

	test('a persistent context (no browser) tries the CDP session', async () => {
		const { page, log } = fakePage(null);
		await withPointer(page, 'coarse', async () => 1);
		expect(log[0]).toBe('session');
	});

	test('an unknown pointer is refused', async () => {
		const { page } = fakePage();
		await expect(
			withPointer(page, 'huge' as never, async () => 1),
		).rejects.toThrow("pointer must be 'fine' or 'coarse'");
	});
});

describe('checkScreen pointer', () => {
	test('wraps the checks, with touch emulation on while they run', async () => {
		const { page, log } = fakePage();
		(page as unknown as { viewportSize: () => null }).viewportSize = () => null;
		(
			page as unknown as { evaluate: () => Promise<number | undefined> }
		).evaluate = (() => {
			let calls = 0;
			return async () => {
				// The first call reads maxTouchPoints; the rest are the checks.
				if (calls++ === 0) return 0;
				log.push('check');
			};
		})();
		await checkScreen(
			page,
			{ project: { name: 'x' }, config: { metadata: {} } } as never,
			'home',
			{ pointer: 'coarse', a11y: false, horizontalScroll: false },
		).catch(() => undefined);
		const on = log.indexOf(ON);
		expect(on).toBeGreaterThan(-1);
		expect(log.indexOf('check')).toBeGreaterThan(on);
		expect(log.indexOf(OFF)).toBeGreaterThan(log.indexOf('check'));
	});
});

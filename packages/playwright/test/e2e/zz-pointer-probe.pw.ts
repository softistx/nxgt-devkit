// TEMPORARY diagnostic for #124 on CI Linux; removed before merge.
import { test, type Page, type CDPSession } from '@playwright/test';

const state = (page: Page) =>
	page.evaluate(() => {
		const q = (m: string) => (matchMedia(m).matches ? 1 : 0);
		return [
			`tp=${navigator.maxTouchPoints}`,
			`p:f${q('(pointer: fine)')}c${q('(pointer: coarse)')}n${q('(pointer: none)')}`,
			`h:h${q('(hover: hover)')}n${q('(hover: none)')}`,
			`ap:f${q('(any-pointer: fine)')}c${q('(any-pointer: coarse)')}n${q('(any-pointer: none)')}`,
			`ah:h${q('(any-hover: hover)')}n${q('(any-hover: none)')}`,
		].join(' ');
	});

const log = (...a: unknown[]) => console.log('PROBE', ...a);
const wait = (page: Page) => page.waitForTimeout(300);

async function cycle(page: Page, cdp: CDPSession) {
	await cdp.send('Emulation.setTouchEmulationEnabled', {
		enabled: true,
		maxTouchPoints: 5,
	});
	await wait(page);
	log('  on      ', await state(page));
	await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	await wait(page);
	log('  off     ', await state(page));
}

test.describe('probe', () => {
	test.skip(({ browserName, hasTouch }) => browserName !== 'chromium' || hasTouch);

	test('probe', async ({ page, context, browser }) => {
		log('version', browser.version(), process.platform);
		await page.setContent('<p>x</p>');
		log('A base    ', await state(page));
		const cdp = await context.newCDPSession(page);
		await cycle(page, cdp);

		await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: false });
		await wait(page);
		log('B emitOff ', await state(page));

		await page.setViewportSize(page.viewportSize()!);
		await wait(page);
		log('C viewport', await state(page));

		await cdp.detach();
		await wait(page);
		log('D detach  ', await state(page));

		await page.reload();
		await wait(page);
		log('E reload  ', await state(page));

		const p2 = await context.newPage();
		await p2.setContent('<p>y</p>');
		log('F newPage ', await state(p2));
		await p2.close();

		const cdp2 = await context.newCDPSession(page);
		for (const features of [
			[{ name: 'hover', value: 'hover' }],
			[{ name: 'pointer', value: 'fine' }],
			[{ name: 'any-hover', value: 'hover' }],
		]) {
			const r = await cdp2
				.send('Emulation.setEmulatedMedia', { features })
				.then(() => 'ok')
				.catch((e: Error) => `err ${e.message}`);
			await wait(page);
			log('G media', JSON.stringify(features), r, await state(page));
		}
		await cdp2.send('Emulation.setEmulatedMedia', { features: [] });
		await wait(page);
		log('G cleared ', await state(page));
		// Second cycle: does a second enable/disable change anything?
		await cycle(page, cdp2);
		await cdp2.detach();

		// Fresh page: emulatedMedia hover:none / pointer:coarse without touch emulation.
		const p3 = await context.newPage();
		await p3.setContent('<p>z</p>');
		const c3 = await context.newCDPSession(p3);
		const r3 = await c3
			.send('Emulation.setEmulatedMedia', {
				features: [
					{ name: 'pointer', value: 'coarse' },
					{ name: 'hover', value: 'none' },
				],
			})
			.then(() => 'ok')
			.catch((e: Error) => `err ${e.message}`);
		await wait(p3);
		log('H coarseMedia', r3, await state(p3));
		await c3.detach();
		await p3.close();
	});
});

// TEMPORARY diagnostic for #124 on CI Linux; removed before merge.
import { type CDPSession, type Page, test } from '@playwright/test';

const state = (page: Page) =>
	page.evaluate(() => {
		const q = (m: string) => (matchMedia(m).matches ? 1 : 0);
		return `tp=${navigator.maxTouchPoints} p:f${q('(pointer: fine)')}n${q('(pointer: none)')} h:h${q('(hover: hover)')}n${q('(hover: none)')} ap:f${q('(any-pointer: fine)')} ah:h${q('(any-hover: hover)')}`;
	});

const log = (...a: unknown[]) => console.log('PROBE', ...a);
const wait = (page: Page) => page.waitForTimeout(300);

type Fix = (page: Page, cdp: CDPSession) => Promise<unknown>;
const fixes: Record<string, Fix> = {
	replaceState: (page) =>
		page.evaluate(() => history.replaceState(history.state, '', location.href)),
	hashNew: (page) =>
		page.evaluate(() => {
			location.hash = location.hash;
		}),
	autoDark: (_, cdp) => cdp.send('Emulation.setAutoDarkModeOverride', {}),
	scriptOn: (_, cdp) =>
		cdp.send('Emulation.setScriptExecutionDisabled', { value: false }),
	lifecycle: (_, cdp) =>
		cdp.send('Page.setWebLifecycleState', { state: 'active' }),
	focusOff: (_, cdp) =>
		cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false }),
	vision: (_, cdp) =>
		cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' }),
	cookieOn: (_, cdp) =>
		cdp.send('Emulation.setDocumentCookieDisabled', { disabled: false }),
	fontSizes: (_, cdp) =>
		cdp.send('Page.setFontSizes', { fontSizes: { standard: 16, fixed: 13 } }),
	mobileToggle: async (page, cdp) => {
		const v = page.viewportSize() ?? { width: 1280, height: 720 };
		await cdp.send('Emulation.setDeviceMetricsOverride', {
			...v,
			deviceScaleFactor: 1,
			mobile: true,
		});
		await page.setViewportSize(v);
	},
	disableTwiceAfterWait: async (page, cdp) => {
		await page.waitForTimeout(1000);
		await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	},
	enableZeroThenDisable: async (_, cdp) => {
		await cdp.send('Emulation.setTouchEmulationEnabled', {
			enabled: true,
			maxTouchPoints: 1,
		});
		await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
	},
	gotoSame: (page) => page.goto(page.url()),
};

test.describe('probe', () => {
	test.skip(
		({ browserName, hasTouch }) => browserName !== 'chromium' || hasTouch,
	);

	test('probe2', async ({ context, browser }) => {
		log('version', browser.version(), process.platform);
		for (const [name, fix] of Object.entries(fixes)) {
			const page = await context.newPage();
			await page.goto('/');
			await page.evaluate(() => {
				(window as unknown as { mark: number }).mark = 1;
			});
			const base = await state(page);
			const cdp = await context.newCDPSession(page);
			await cdp.send('Emulation.setTouchEmulationEnabled', {
				enabled: true,
				maxTouchPoints: 5,
			});
			await wait(page);
			await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
			await wait(page);
			const off = await state(page);
			const r = await fix(page, cdp)
				.then(() => 'ok')
				.catch((e: Error) => `err ${e.message.slice(0, 80)}`);
			await wait(page);
			const after = await state(page);
			const kept = await page.evaluate(
				() => (window as unknown as { mark?: number }).mark === 1,
			);
			log(
				name.padEnd(22),
				r,
				after === base ? 'RESTORED' : 'no',
				`kept=${kept}`,
				'| base',
				base,
				'| off',
				off,
				'| after',
				after,
			);
			await cdp.detach().catch(() => undefined);
			await page.close();
		}
	});
});

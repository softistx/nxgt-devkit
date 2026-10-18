import { expect, test } from '@playwright/test';
import { expectTapTargets } from '../../src/helpers';
import { probeHitAreas } from '../../src/helpers/tap-targets/hit-area';
import { measure } from '../../src/helpers/tap-targets/measure';

test.use({ viewport: { width: 412, height: 800 } });

const html = (body: string) =>
	`<meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:16px;font:16px sans-serif}.box{display:block;border:0;padding:0;margin:0 0 60px}</style>${body}`;
// A box of exactly w x h CSS pixels.
const sized = (
	tag: string,
	w: number,
	h = w,
	attrs = '',
	inner = 'Go',
	cls = '',
) =>
	`<${tag} class="box ${cls}" ${attrs} style="width:${w}px;height:${h}px">${inner}</${tag}>`;

const failure = async (run: Promise<void>) => {
	const error = await run.catch((e: Error) => e);
	expect(error).toBeInstanceOf(Error);
	return (error as Error).message;
};

test('44x44 passes; 40x40 fails and names the target and its size', async ({
	page,
}) => {
	await page.setContent(html(sized('button', 44)));
	await expectTapTargets(page);
	await page.setContent(
		html(
			sized('button', 40, 40, 'id="close" aria-label="Close"', 'x') +
				sized('a', 120, 44, 'href="#" class="ok"'),
		),
	);
	const lines = (await failure(expectTapTargets(page))).split('\n');
	expect(lines[0]).toBe(
		'1 tap target is smaller than 44x44px (412x800 viewport):',
	);
	expect(lines[1]).toBe('  - button#close.box "Close"  40x40px');
});

test('a wide but short link fails on its height', async ({ page }) => {
	await page.setContent(html(sized('a', 300, 24, 'href="#"')));
	expect(await failure(expectTapTargets(page))).toContain('300x24px');
});

test('size moves the bar', async ({ page }) => {
	await page.setContent(html(sized('button', 40)));
	await expectTapTargets(page, { size: 40 });
	const message = await failure(expectTapTargets(page, { size: 48 }));
	expect(message).toContain('smaller than 48x48px');
});

test('hidden, disabled, aria-disabled, inert and pointer-events none are not targets', async ({
	page,
}) => {
	await page.setContent(
		html(
			[
				sized('button', 20, 20, 'disabled'),
				sized('button', 20, 20, 'aria-disabled="true"'),
				`<div inert>${sized('button', 20)}</div>`,
				`<div style="pointer-events:none">${sized('a', 20, 20, 'href="#"')}</div>`,
				`<div style="visibility:hidden">${sized('button', 20)}</div>`,
				`<div style="display:none">${sized('button', 20)}</div>`,
				'<button class="box" style="width:0;height:0;padding:0;border:0;overflow:hidden"></button>',
				'<input type="hidden" name="x">',
				'<a name="anchor">not a link</a>',
			].join(''),
		),
	);
	await expectTapTargets(page);
});

test('a link inside a sentence is exempt; the same link alone is not', async ({
	page,
}) => {
	await page.setContent(
		html('<p>Read the <a href="#terms">terms</a> before you sign.</p>'),
	);
	await expectTapTargets(page);
	await page.setContent(html('<p><a href="#terms">terms</a></p>'));
	expect(await failure(expectTapTargets(page))).toContain('  - a "terms"  ');
});

test('a link nested in inline elements is exempt when text sits beside them', async ({
	page,
}) => {
	await page.setContent(
		html('<p><strong><a href="#t">terms</a></strong> and more text</p>'),
	);
	await expectTapTargets(page);
	await page.setContent(html('<p><strong><a href="#t">terms</a></strong></p>'));
	expect(await failure(expectTapTargets(page))).toContain('  - a "terms"  ');
	await page.setContent(
		html(
			'<p>Read <a href="#t" style="display:inline-block;width:30px;height:20px">terms</a> now</p>',
		),
	);
	expect(await failure(expectTapTargets(page))).toContain('30x20px');
});

test('a visually hidden skip link is not measured', async ({ page }) => {
	await page.setContent(
		html(
			'<a href="#main" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">Skip</a><a href="#x" style="position:absolute;clip-path:inset(50%)">Skip 2</a>',
		),
	);
	await expectTapTargets(page);
});

test('a small checkbox counts together with its label, wrapped or `for`', async ({
	page,
}) => {
	await page.setContent(
		html(
			`<label style="display:flex;align-items:center;min-height:44px;width:200px"><input type="checkbox"> Remember me</label>
			<input id="r" type="radio"><label for="r" style="display:inline-block;width:160px;height:44px">Yes</label>`,
		),
	);
	await expectTapTargets(page);
	await page.setContent(html('<input type="checkbox" aria-label="Agree">'));
	expect(await failure(expectTapTargets(page))).toContain('input');
});

test('a role, a tabindex and an onclick make a target; tabindex -1 does not', async ({
	page,
}) => {
	const message = async (attrs: string) => {
		await page.setContent(html(sized('div', 30, 30, attrs)));
		return expectTapTargets(page).then(
			() => 'passes',
			(e: Error) => e.message,
		);
	};
	expect(await message('role="button"')).toContain('30x30px');
	expect(await message('tabindex="0"')).toContain('30x30px');
	expect(await message('onclick="0"')).toContain('30x30px');
	expect(await message('tabindex="-1"')).toBe('passes');
	expect(await message('')).toBe('passes');
});

test('include limits the search, exclude silences a target', async ({
	page,
}) => {
	await page.setContent(
		html(
			`<nav>${sized('a', 20, 20, 'href="#"', 'Go', 'n')}</nav><footer>${sized('a', 20, 20, 'href="#"', 'Go', 'f')}</footer>`,
		),
	);
	const only = await failure(expectTapTargets(page, { include: 'nav' }));
	expect(only).toContain('a.box.n');
	expect(only).not.toContain('a.box.f');
	await expectTapTargets(page, { exclude: ['nav a', 'footer'] });
});

test('an empty targets list throws a named error, not a selector SyntaxError', async ({
	page,
}) => {
	await page.setContent(html(sized('button', 20)));
	expect(await failure(expectTapTargets(page, { targets: [] }))).toContain(
		'expectTapTargets: `targets` is empty.',
	);
});

test('an include matching nothing fails by name instead of passing', async ({
	page,
}) => {
	await page.setContent(html(sized('button', 20)));
	const message = await failure(
		expectTapTargets(page, { include: ['.nav', '#typo'] }),
	);
	expect(message).toContain('expectTapTargets: `include` matched no element');
	expect(message).toContain('.nav, #typo');
	// One selector of the list matching is enough.
	await expectTapTargets(page, {
		include: ['.nav', 'body'],
		exclude: 'button',
	});
});

test('targets replaces what counts', async ({ page }) => {
	await page.setContent(
		html(sized('button', 20) + sized('div', 20, 20, '', 'Go', 'chip')),
	);
	const message = await failure(expectTapTargets(page, { targets: '.chip' }));
	expect(message).toContain('1 tap target is');
	expect(message).toContain('div.box.chip');
});

test('spacing: a small target alone passes, a crowded one fails and names its neighbour', async ({
	page,
}) => {
	await page.setContent(html(sized('button', 24)));
	await failure(expectTapTargets(page));
	await expectTapTargets(page, { spacing: true });
	await page.setContent(
		html(
			'<div style="display:flex;gap:4px"><button class="a" style="width:24px;height:24px"></button><button class="b" style="width:120px;height:48px"></button></div>',
		),
	);
	const message = await failure(expectTapTargets(page, { spacing: true }));
	expect(message).toContain('button.a  24x24px, too close to button.b');
});

test('max limits the list, the count stays whole', async ({ page }) => {
	await page.setContent(
		html(Array.from({ length: 4 }, () => sized('button', 20)).join('')),
	);
	const message = await failure(expectTapTargets(page, { max: 2 }));
	expect(message.split('\n')[0]).toContain('4 tap targets are');
	expect(message.match(/^ {2}- /gm)).toHaveLength(2);
	expect(message).toContain('… and 2 more');
});

test('sizes are CSS pixels, whatever the device pixel ratio', async ({
	browser,
}) => {
	const context = await browser.newContext({
		viewport: { width: 412, height: 800 },
		deviceScaleFactor: 3,
	});
	const page = await context.newPage();
	await page.setContent(html(sized('button', 44)));
	await expectTapTargets(page);
	await context.close();
});

// A 20px control drawn with an invisible 44px ::before, as a design system's
// checkbox, switch or toast close is.
const enlarged = (
	pseudo: number,
	{ media = false, attrs = '', after = '' } = {},
) => {
	const rule = `.hit{position:relative}.hit::before{content:"";position:absolute;left:50%;top:50%;width:${pseudo}px;height:${pseudo}px;transform:translate(-50%,-50%)}`;
	return `<style>${media ? `@media (pointer: coarse){${rule}}` : rule}</style><button class="box hit" ${attrs} aria-label="Toggle" style="width:20px;height:20px"></button>${after}`;
};

test('an invisible 44px ::before makes a 20px control pass; hitArea: false does not', async ({
	page,
}) => {
	await page.setContent(html(enlarged(44)));
	await expectTapTargets(page);
	await expectTapTargets(page, { spacing: true });
	const message = await failure(expectTapTargets(page, { hitArea: false }));
	expect(message).toContain('button.box.hit "Toggle"  20x20px');
});

test('a ::before under pointer: coarse counts on a phone, not on a mouse', async ({
	page,
}, testInfo) => {
	// The mobile project (a Pixel 7, hasTouch) emulates `pointer: coarse`;
	// the desktop one does not, so one rule gives both outcomes.
	const coarse = testInfo.project.name === 'mobile-chromium';
	await page.setContent(html(enlarged(44, { media: true })));
	expect(
		await page.evaluate(() => matchMedia('(pointer: coarse)').matches),
	).toBe(coarse);
	if (coarse) {
		await expectTapTargets(page);
	} else {
		expect(await failure(expectTapTargets(page))).toContain('20x20px');
	}
});

test('a neighbour covering part of the 44px square fails and names the target', async ({
	page,
}) => {
	await page.setContent(
		html(
			`<style>.hit{position:relative}.hit::before{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%)}</style>
			<div style="position:relative;height:100px"><button class="box hit" id="t" aria-label="Toggle" style="position:absolute;left:100px;top:40px;width:20px;height:20px"></button>
			<div style="position:absolute;left:128px;top:30px;width:60px;height:40px;background:#ccc;z-index:2"></div></div>`,
		),
	);
	const message = await failure(expectTapTargets(page));
	expect(message).toContain('button#t.box.hit "Toggle"  20x20px');
});

test('a 30px ::before is not enough for 44', async ({ page }) => {
	await page.setContent(html(enlarged(30)));
	expect(await failure(expectTapTargets(page))).toContain('20x20px');
	await expectTapTargets(page, { size: 30 });
});

test('a pointer-events: none ::before is no hit area', async ({ page }) => {
	await page.setContent(
		html(
			enlarged(44).replace(
				'<style>',
				'<style>.hit::before{pointer-events:none}',
			),
		),
	);
	expect(await failure(expectTapTargets(page))).toContain('20x20px');
});

test('a control far below the fold is probed and the scroll is put back', async ({
	page,
}) => {
	await page.setContent(
		html(
			`<div style="height:3000px"></div>${enlarged(44, { after: '' })}<div style="height:600px"></div>`,
		),
	);
	await page.evaluate(() => window.scrollTo(0, 120));
	await expectTapTargets(page);
	expect(await page.evaluate(() => window.scrollY)).toBe(120);
	// The same, but it fails: nothing enlarges it, and the scroll is still put back.
	await page.setContent(
		html(
			`<div style="height:3000px"></div>${sized('button', 20)}<div style="height:600px"></div>`,
		),
	);
	await page.evaluate(() => window.scrollTo(0, 50));
	await failure(expectTapTargets(page));
	expect(await page.evaluate(() => window.scrollY)).toBe(50);
});

// Rows of 20px controls with an invisible 44px ::before, and a 96px bar
// stuck to the bottom of the viewport (a form's sticky actions): row
// `under` sits beneath the bar on an 800px viewport.
const stickyRows = Array.from(
	{ length: 20 },
	(_, i) =>
		`<div class="row"><button type="button" class="hit" id="o${i}" aria-label="Option ${i}" style="width:20px;height:20px;border:0;padding:0;margin:12px"></button>Option ${i}</div>`,
).join('');
const stickyForm = (bar: string) =>
	html(
		`<style>.hit{position:relative}.hit::before{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%)}.row{display:flex;align-items:center;gap:12px;min-height:44px;margin-bottom:20px}</style><form>${stickyRows}<div style="${bar};height:96px;background:white">Save</div></form>`,
	);

test('a control under a sticky actions bar is scrolled clear of it and probed again', async ({
	page,
}) => {
	await page.setContent(stickyForm('position:sticky;bottom:0'));
	// One of the rows really is under the bar where it sits.
	const covered = await page.evaluate(() =>
		[...document.querySelectorAll('.hit')].some((el) => {
			const r = el.getBoundingClientRect();
			const hit = document.elementFromPoint(
				r.left + r.width / 2,
				r.top + r.height / 2,
			);
			return r.bottom <= innerHeight && hit !== null && !el.contains(hit);
		}),
	);
	expect(covered).toBe(true);
	await page.evaluate(() => window.scrollTo(0, 10));
	await expectTapTargets(page);
	expect(await page.evaluate(() => window.scrollY)).toBe(10);
});

test('a control a fixed overlay still covers once scrolled fails', async ({
	page,
}) => {
	// A fixed sheet over the whole viewport: no scroll clears it.
	await page.setContent(
		stickyForm('position:fixed;inset:0;height:auto!important;z-index:5'),
	);
	await page.evaluate(() => window.scrollTo(0, 10));
	expect(await failure(expectTapTargets(page))).toContain('20x20px');
	expect(await page.evaluate(() => window.scrollY)).toBe(10);
});

test('a control inside a scrolled container: its scrollTop and the window are restored', async ({
	page,
}) => {
	await page.setContent(
		html(
			`<div style="height:200px"></div><div id="pane" style="height:300px;overflow:auto;padding:0 24px"><div style="height:1500px"></div>${enlarged(44)}<div style="height:800px"></div></div><div style="height:2000px"></div>`,
		),
	);
	await page.evaluate(() => {
		(document.getElementById('pane') as HTMLElement).scrollTop = 40;
	});
	await page.evaluate(() => window.scrollTo(0, 30));
	const before = await page.evaluate(() => [
		window.scrollY,
		(document.getElementById('pane') as HTMLElement).scrollTop,
	]);
	await expectTapTargets(page);
	expect(
		await page.evaluate(() => [
			window.scrollY,
			(document.getElementById('pane') as HTMLElement).scrollTop,
		]),
	).toEqual(before);
});

test('a checkbox whose label covers the square passes as before, with or without hitArea', async ({
	page,
}) => {
	await page.setContent(
		html(
			'<label style="display:flex;align-items:center;min-height:44px;width:200px"><input type="checkbox"> Remember me</label>',
		),
	);
	await expectTapTargets(page);
	await expectTapTargets(page, { hitArea: false });
});

test('a label whose ::before covers the square passes through the hit probe', async ({
	page,
}) => {
	// The input and its label are 20x20px together, under 44: only the label's
	// own 44px ::before reaches the probe. Without hitArea it fails.
	await page.setContent(
		html(
			'<style>.lab{position:relative;display:block;width:20px;height:20px}.lab::before{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%)}</style><label class="lab"><input type="checkbox" style="margin:0;display:block;width:20px;height:20px"></label>',
		),
	);
	await expectTapTargets(page);
	expect(await failure(expectTapTargets(page, { hitArea: false }))).toContain(
		'20x20px',
	);
});

// A fixed 20px button in the bottom-right corner, with a 44px ::before
// placed by `before`.
const fixedCorner = (before: string) =>
	html(
		`<style>#t{position:fixed;right:0;bottom:0;width:20px;height:20px;margin:0}#t::before{content:"";position:absolute;width:44px;height:44px;${before}}</style><button id="t" class="box" aria-label="Toggle"></button><div style="height:2000px"></div>`,
	);

test('a fixed control at the edge needs a full square on screen', async ({
	page,
}) => {
	// Centred 44px ::before: 12px of it is off screen, so only ~32px count.
	await page.setContent(
		fixedCorner('left:50%;top:50%;transform:translate(-50%,-50%)'),
	);
	expect(await failure(expectTapTargets(page))).toContain('20x20px');
	// Offset so the whole 44px square sits on screen.
	await page.setContent(fixedCorner('right:0;bottom:0'));
	await expectTapTargets(page);
});

test('the same fixed corner in standards mode (with a doctype)', async ({
	page,
}) => {
	const standards = (before: string) => `<!doctype html>${fixedCorner(before)}`;
	await page.setContent(
		standards('left:50%;top:50%;transform:translate(-50%,-50%)'),
	);
	expect(await page.evaluate(() => document.compatMode)).toBe('CSS1Compat');
	expect(await failure(expectTapTargets(page))).toContain('20x20px');
	await page.setContent(standards('right:0;bottom:0'));
	await expectTapTargets(page);
});

test('several targets: exclude and a skipped one before, overlapping include roots, exactly the failing ones fail', async ({
	page,
}) => {
	const small = (id: string, cls = '', attrs = '') =>
		`<button id="${id}" class="box ${cls}" ${attrs} aria-label="${id}" style="position:relative;width:20px;height:20px"></button>`;
	await page.setContent(
		html(
			`<style>.hit::before{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%)}</style>
			<main>${small('skipped-excluded', 'hit ex')}${small('skipped-disabled', 'hit', 'disabled')}${small('pass1', 'hit')}${small('fail1')}
			<section>${small('pass2', 'hit')}${small('fail2')}</section></main>`,
		),
	);
	const message = await failure(
		expectTapTargets(page, {
			include: ['main', 'main section'],
			exclude: '.ex',
		}),
	);
	expect(message.split('\n')[0]).toContain('2 tap targets are');
	expect(message).toContain('button#fail1');
	expect(message).toContain('button#fail2');
	expect(message).not.toMatch(/pass1|pass2|skipped/);
});

test('the probe tests the measured elements, whatever the page does in between', async ({
	page,
}) => {
	const hit = (id: string) =>
		`<button id="${id}" class="box hit" aria-label="${id}" style="position:relative;width:20px;height:20px"></button>`;
	await page.setContent(
		html(
			`<style>.hit::before{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%)}</style>${hit('a')}${hit('b')}${hit('c')}`,
		),
	);
	const handle = await page.evaluateHandle(measure, {
		size: 44,
		tolerance: 0.5,
		hitArea: true,
		targets: ['button'],
		include: [],
		exclude: [],
	});
	const data = await handle.evaluate((r) => r.data);
	expect(data.probe).toEqual([0, 1, 2]);
	// A removed target (index 0) and a class dropped from the last one: the
	// probe must not shift to other elements.
	await page.evaluate(() => {
		document.getElementById('a')?.remove();
		document.getElementById('c')?.classList.remove('hit');
	});
	expect(await handle.evaluate(probeHitAreas, { size: 44 })).toEqual([1]);
	await handle.dispose();
});

test('a button with a child drawn 12px outside its box passes', async ({
	page,
}) => {
	await page.setContent(
		html(
			'<button class="box" aria-label="Out" style="position:relative;width:20px;height:20px"><span style="position:absolute;inset:-12px"></span></button>',
		),
	);
	await expectTapTargets(page);
	expect(await failure(expectTapTargets(page, { hitArea: false }))).toContain(
		'20x20px',
	);
});

test('a custom element with an open shadow tree drawing 44px passes', async ({
	page,
}) => {
	await page.setContent(
		html(
			'<button class="box" aria-label="Shadow" style="position:relative;width:20px;height:20px"><x-big></x-big></button>',
		),
	);
	await page.evaluate(() => {
		customElements.define(
			'x-big',
			class extends HTMLElement {
				constructor() {
					super();
					this.attachShadow({ mode: 'open' }).innerHTML =
						'<div style="position:absolute;left:-12px;top:-12px;width:44px;height:44px"></div>';
				}
			},
		);
	});
	await expectTapTargets(page);
	expect(await failure(expectTapTargets(page, { hitArea: false }))).toContain(
		'20x20px',
	);
});

test('a custom element in a checkbox label, drawing 44px in its shadow tree, passes', async ({
	page,
}) => {
	await page.setContent(
		html(
			'<label style="position:relative;display:inline-block;width:20px;height:20px"><input type="checkbox" style="width:20px;height:20px;margin:0" aria-label="Agree"><x-big></x-big></label>',
		),
	);
	await page.evaluate(() => {
		customElements.define(
			'x-big',
			class extends HTMLElement {
				constructor() {
					super();
					this.attachShadow({ mode: 'open' }).innerHTML =
						'<div style="position:absolute;left:-12px;top:-12px;width:44px;height:44px"></div>';
				}
			},
		);
	});
	await expectTapTargets(page);
	expect(await failure(expectTapTargets(page, { hitArea: false }))).toContain(
		'20x20px',
	);
});

test('a control scrolled out of its pane, inside the viewport, is scrolled in, probed and put back', async ({
	page,
}) => {
	await page.setContent(
		html(
			`<div id="pane" style="height:200px;overflow:auto;padding:0 24px"><div style="height:500px"></div>${enlarged(44)}<div style="height:800px"></div></div><div style="height:1500px"></div>`,
		),
	);
	await page.evaluate(() => {
		(document.getElementById('pane') as HTMLElement).scrollTop = 10;
	});
	await expectTapTargets(page);
	expect(
		await page.evaluate(
			() => (document.getElementById('pane') as HTMLElement).scrollTop,
		),
	).toBe(10);
});

test('scrollers in a shadow root around a slotted target are restored', async ({
	page,
}) => {
	await page.setContent(
		html(
			`<style>.hit{position:relative}.hit::before{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%)}</style>
			<div style="height:200px"></div>
			<x-scroller><button class="box hit" aria-label="Toggle" style="width:20px;height:20px"></button></x-scroller>
			<div style="height:2000px"></div>`,
		),
	);
	await page.evaluate(() => {
		customElements.define(
			'x-scroller',
			class extends HTMLElement {
				constructor() {
					super();
					const root = this.attachShadow({ mode: 'open' });
					root.innerHTML =
						'<div id="s" style="height:300px;overflow:auto;padding:0 24px"><div style="height:1500px"></div><slot></slot><div style="height:800px"></div></div>';
				}
			},
		);
		const s = document
			.querySelector('x-scroller')
			?.shadowRoot?.getElementById('s') as HTMLElement;
		s.scrollTop = 40;
		window.scrollTo(0, 30);
	});
	const read = () =>
		page.evaluate(() => [
			window.scrollY,
			document.querySelector('x-scroller')?.shadowRoot?.getElementById('s')
				?.scrollTop,
		]);
	const before = await read();
	expect(before).toEqual([30, 40]);
	await expectTapTargets(page);
	expect(await read()).toEqual(before);
});

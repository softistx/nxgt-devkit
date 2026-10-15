import { expect, test } from '@playwright/test';
import { expectTapTargets } from '../../src/helpers';

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

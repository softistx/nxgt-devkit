import { expect, test } from '@playwright/test';
import { expectNoTextOverflow, isMobileProject } from '../../src/helpers';

test.use({ viewport: { width: 412, height: 800 } });

// Monospace and 40 'W's in boxes of fixed width: what fits does not depend
// on the fonts the machine has. 40 characters at 16px monospace are far more
// than the 100 to 180px boxes below, whatever the font.
const WIDE = 'W'.repeat(40);
const html = (body: string) =>
	`<meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:16px;font:16px monospace}</style>${body}`;
const CLIP =
	'display:block;width:180px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis';

const failure = async (run: Promise<void>) => {
	const error = await run.catch((e: Error) => e);
	expect(error).toBeInstanceOf(Error);
	return (error as Error).message;
};

test('text that wraps passes', async ({ page }) => {
	await page.setContent(
		html(`<p style="width:180px;word-break:break-all">${WIDE}</p>`),
	);
	await expectNoTextOverflow(page);
});

test('an ellipsis without a title fails and names the box', async ({
	page,
}) => {
	await page.setContent(
		html(`<span class="title" style="${CLIP}">${WIDE}</span>`),
	);
	const message = await failure(expectNoTextOverflow(page));
	const lines = message.split('\n');
	expect(lines[0]).toMatch(
		/^Text overflows its box in 1 element \(412x800 viewport\):$/,
	);
	expect(lines[1]).toMatch(
		/^ {2}- span\.title {2}clipped with an ellipsis, no title: "W{40}" {2}\d+px of text in a 180px box$/,
	);
});

test('an ellipsis with a title passes', async ({ page }) => {
	await page.setContent(
		html(`<span title="${WIDE}" style="${CLIP}">${WIDE}</span>`),
	);
	await expectNoTextOverflow(page);
});

test('an aria-label counts as the full text', async ({ page }) => {
	await page.setContent(
		html(`<span aria-label="${WIDE}" style="${CLIP}">${WIDE}</span>`),
	);
	await expectNoTextOverflow(page);
});

test('a title on the link that wraps the box and holds only its text passes', async ({
	page,
}) => {
	await page.setContent(
		html(
			`<a href="#" title="${WIDE}"><span style="${CLIP}">${WIDE}</span></a>`,
		),
	);
	await expectNoTextOverflow(page);
});

test('a title on a wrapper that holds more than the text does not count', async ({
	page,
}) => {
	await page.setContent(
		html(
			`<div title="Row"><span style="${CLIP}">${WIDE}</span> and more</div>`,
		),
	);
	await failure(expectNoTextOverflow(page));
});

test('nowrap in a visible box spills', async ({ page }) => {
	await page.setContent(
		html(
			`<button id="save" style="display:block;width:100px;border:0;white-space:nowrap">${WIDE}</button>`,
		),
	);
	const message = await failure(expectNoTextOverflow(page));
	expect(message.split('\n')[1]).toMatch(
		/^ {2}- button#save {2}spills: "W{40}" {2}\d+px of text in a 100px box$/,
	);
});

test('a line clamp without a title fails on the height', async ({ page }) => {
	await page.setContent(
		html(
			`<p class="clamp" style="width:180px;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;word-break:break-all">${WIDE}${WIDE}${WIDE}</p>`,
		),
	);
	const message = await failure(expectNoTextOverflow(page));
	expect(message.split('\n')[1]).toMatch(
		/^ {2}- p\.clamp {2}clipped with an ellipsis, no title: .* {2}\d+px of text in a \d+px-tall box$/,
	);
});

test('a box that scrolls sideways passes', async ({ page }) => {
	await page.setContent(
		html(
			`<div style="width:180px;overflow-x:auto;white-space:nowrap">${WIDE}</div>`,
		),
	);
	await expectNoTextOverflow(page);
});

test('a text for screen readers only passes', async ({ page }) => {
	await page.setContent(
		html(
			`<span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap">${WIDE}</span>`,
		),
	);
	await expectNoTextOverflow(page);
});

test('a card that clips a decoration but not its text passes', async ({
	page,
}) => {
	await page.setContent(
		html(
			`<div style="width:180px;height:60px;overflow:hidden;position:relative"><p style="margin:0">Fits</p><div style="position:absolute;left:0;top:0;width:600px;height:20px;background:#ccc"></div></div>`,
		),
	);
	await expectNoTextOverflow(page);
});

test('a hidden or transparent text is not measured', async ({ page }) => {
	await page.setContent(
		html(
			`<span style="display:block;width:100px;white-space:nowrap;visibility:hidden">${WIDE}</span><span style="display:block;width:100px;white-space:nowrap;opacity:0">${WIDE}</span>`,
		),
	);
	await expectNoTextOverflow(page);
});

test('exclude silences a box', async ({ page }) => {
	await page.setContent(
		html(`<span class="marquee" style="${CLIP}">${WIDE}</span>`),
	);
	await failure(expectNoTextOverflow(page));
	await expectNoTextOverflow(page, { exclude: '.marquee' });
});

test('include limits the search', async ({ page }) => {
	await page.setContent(
		html(`<span style="${CLIP}">${WIDE}</span><main><p>Fits</p></main>`),
	);
	await expectNoTextOverflow(page, { include: 'main' });
});

test('max limits the list, not the count', async ({ page }) => {
	await page.setContent(
		html(
			Array.from(
				{ length: 4 },
				(_, i) => `<span id="s${i}" style="${CLIP}">${WIDE}</span>`,
			).join(''),
		),
	);
	const message = await failure(expectNoTextOverflow(page, { max: 2 }));
	const lines = message.split('\n');
	expect(lines[0]).toContain('in 4 elements');
	expect(lines.filter((l) => l.startsWith('  - '))).toHaveLength(2);
	expect(message).toContain('… and 2 more');
});

test('a label that fits on a desktop and clips on a phone', async ({
	page,
}, testInfo) => {
	test.skip(!isMobileProject(testInfo), 'the phone projects only');
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.setContent(
		html(
			`<span style="display:block;width:50vw;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${'W'.repeat(30)}</span>`,
		),
	);
	await expectNoTextOverflow(page);
	await page.setViewportSize({ width: 412, height: 800 });
	const message = await failure(expectNoTextOverflow(page));
	expect(message).toContain('clipped with an ellipsis');
});

test('a fixed-height box of block children is not judged by its height', async ({
	page,
}) => {
	await page.setContent(
		html(
			`<div style="width:180px;height:40px;overflow:hidden"><p style="margin:0;height:120px">Fits</p></div>`,
		),
	);
	await expectNoTextOverflow(page);
});

test('a text pushed past the left edge by a negative indent is caught', async ({
	page,
}) => {
	await page.setContent(
		html(
			`<p class="indent" style="width:180px;overflow:hidden;white-space:nowrap;text-indent:-120px">${'W'.repeat(20)}</p>`,
		),
	);
	const message = await failure(expectNoTextOverflow(page));
	expect(message.split('\n')[1]).toContain('p.indent  clipped');
});

test('a right-to-left text that runs out on the left is caught', async ({
	page,
}) => {
	await page.setContent(
		html(
			`<p class="rtl" dir="rtl" style="width:180px;overflow:hidden;white-space:nowrap">${WIDE}</p>`,
		),
	);
	const message = await failure(expectNoTextOverflow(page));
	expect(message.split('\n')[1]).toContain('p.rtl  clipped');
});

test('overflow: clip counts as clipped', async ({ page }) => {
	await page.setContent(
		html(
			`<span class="clip" style="display:block;width:180px;overflow:clip;white-space:nowrap">${WIDE}</span>`,
		),
	);
	const message = await failure(expectNoTextOverflow(page));
	expect(message.split('\n')[1]).toContain('span.clip  clipped');
});

test('too many lines for a fixed height spill on the y axis', async ({
	page,
}) => {
	await page.setContent(
		html(
			`<p class="tall" style="width:180px;height:20px;margin:0;word-break:break-all">${WIDE}${WIDE}</p>`,
		),
	);
	const message = await failure(expectNoTextOverflow(page));
	expect(message.split('\n')[1]).toMatch(
		/^ {2}- p\.tall {2}spills: .* {2}\d+px of text in a 20px-tall box$/,
	);
});

test('form controls, svg text and contenteditable are not measured', async ({
	page,
}) => {
	await page.setContent(
		html(
			`<input style="width:60px" value="${WIDE}">
<textarea style="width:60px;white-space:nowrap;overflow:hidden">${WIDE}</textarea>
<svg width="60" height="20"><text y="15">${WIDE}</text></svg>
<div contenteditable style="${CLIP}">${WIDE}</div>`,
		),
	);
	await expectNoTextOverflow(page);
});

test('include and exclude take lists', async ({ page }) => {
	await page.setContent(
		html(
			['a', 'b', 'c']
				.map((c) => `<span class="${c}" style="${CLIP}">${WIDE}</span>`)
				.join(''),
		),
	);
	const included = await failure(
		expectNoTextOverflow(page, { include: ['.a', '.b'] }),
	);
	expect(included).toContain('in 2 elements');
	expect(included).not.toContain('span.c');
	const excluded = await failure(
		expectNoTextOverflow(page, { exclude: ['.a', '.b'] }),
	);
	expect(excluded).toContain('in 1 element ');
	expect(excluded).toContain('span.c');
});

test('a text under a transform is skipped', async ({ page }) => {
	await page.setContent(
		html(
			`<div style="transform:scale(2);transform-origin:0 0;width:180px"><span style="${CLIP}">${WIDE}</span></div>
<span style="${CLIP};rotate:10deg">${WIDE}</span>`,
		),
	);
	await expectNoTextOverflow(page);
});

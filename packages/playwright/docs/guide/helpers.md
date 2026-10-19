# Helpers

Fills that survive hydration (`fillSettled`, `fillUntilEnabled`), waits for a
page at rest (`nextFrames`, `settled`, `toastsGone`), a check that a layout
does not scroll sideways (`expectNoHorizontalScroll`), and the screenshot file
name `BasePage` uses (`screenshotName`), from `@nxgt/playwright/helpers` or the
root. Waiting for the page itself to hydrate (`hydrated`, `withHydration`) has
its own page: [hydration.md](hydration.md).

```ts
import { expect, test } from '@playwright/test';
import { fillSettled } from '@nxgt/playwright/helpers';

test('searches', async ({ page }) => {
	await page.goto('/projects');
	const search = page.getByTestId('search');
	await fillSettled(search, 'Apollo');
	await expect(search).toHaveValue('Apollo');
});
```

## Why a plain `fill` is lost

A server-rendered page has its inputs in the HTML, visible and fillable,
before the framework's JavaScript has run. Playwright fills them as soon as
they are actionable. Then the framework hydrates, and a controlled input is
reset to its initial state value — usually `''`. The value typed a moment ago
is gone, no error is raised, and the test fails later on a validation message
or an empty request.

Waiting a fixed time before filling hides it on a fast machine and fails on a
slow CI runner. These helpers fill, wait `settle` ms, and check the value is
still there — a value that survives the wait was typed into a hydrated input.
If it did not, they fill again, until `timeout`.

## `fillSettled`

```ts
type FillSettledOptions = {
	settle?: number; // default 300
	timeout?: number; // default 30_000
};

function fillSettled(input: Locator, value: string, options?: FillSettledOptions): Promise<void>;
```

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `settle` | `number` (ms) | `300` | How long the value must survive before it counts. Raise it past the app's hydration time. |
| `timeout` | `number` (ms) | `30_000` | Give up after this long; the last `toHaveValue` failure is thrown. |

```ts
await fillSettled(page.getByTestId('name'), 'Ada', { settle: 400 });
```

It throws the usual Playwright assertion error (`expect(locator).toHaveValue`
… timed out) when the value never holds within `timeout`, wrapped by
`toPass`.

## `fillUntilEnabled`

For a form whose submit button stays disabled until the form is valid. The
button enables on the first fill, **before** hydration resets the fields and
disables it again, so seeing it enabled once proves nothing.
`fillUntilEnabled` fills every field, waits for `submit` to be enabled, waits
`settle` ms, and checks every value and the button again — refilling the whole
set if any was reset.

```ts
function fillUntilEnabled(
	fields: ReadonlyArray<readonly [Locator, string]>,
	submit: Locator,
	options?: FillSettledOptions,
): Promise<void>;
```

Same options as `fillSettled`. It does not click: the button is left enabled
for you.

```ts
import { expect, test } from '@playwright/test';
import { fillUntilEnabled } from '@nxgt/playwright/helpers';

test('signs up', async ({ page }) => {
	await page.goto('/signup');
	const submit = page.getByTestId('submit');
	await fillUntilEnabled(
		[
			[page.getByTestId('email'), 'ada@example.com'],
			[page.getByTestId('password'), 'correct horse battery staple'],
		],
		submit,
	);
	await submit.click();
	await expect(page).toHaveURL('/welcome');
});
```

In a page object, pass `FormPage`'s `submitButton` — see
[pages-and-fixtures.md](pages-and-fixtures.md#formpage).

## `nextFrames` and `settled`

A check made while the page is still moving reads what was never shown: axe
measures the colour of a box half-way through a fade, a screenshot catches a
menu mid-slide.

```ts
function nextFrames(page: Page, count?: number): Promise<void>; // count default 2
function settled(page: Page): Promise<void>;
```

- `nextFrames` resolves after `count` animation frames. After a render, the
  first frame commits it and the second has run the effects it scheduled.
- `settled` resolves once every finite CSS animation, CSS transition and Web
  Animation in the document has ended (`document.getAnimations()`). An
  infinite one, such as a spinner, is left running; a cancelled one counts as
  ended.

```ts
import { expectAccessible } from '@nxgt/playwright/a11y';
import { settled } from '@nxgt/playwright/helpers';

test('projects are accessible', async ({ page }) => {
	await page.goto('/projects');
	await page.getByRole('button', { name: 'Filters' }).click();
	await settled(page);
	await expectAccessible(page);
});
```

`settled` does **not** wait for web fonts. A font that arrives late changes
widths and metrics, so wait for it first when a check depends on them:

```ts
await page.evaluate(() => document.fonts.ready);
await settled(page);
```

## `toastsGone`

Waits for the toast saying `text` to show, then for every toast to go.

```ts
type ToastsGoneOptions = {
	selector?: string; // default '[data-sonner-toast]'
	timeout?: number; // default 15_000
};

function toastsGone(page: Page, text: string | RegExp, options?: ToastsGoneOptions): Promise<void>;
```

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `selector` | `string` | `[data-sonner-toast]` | What a toast is. The default is sonner's; pass your library's. |
| `timeout` | `number` (ms) | `15_000` | How long the toasts may take to go. |

```ts
import { toastsGone } from '@nxgt/playwright/helpers';

await page.getByRole('button', { name: 'Save' }).click();
await toastsGone(page, 'Project saved');
```

It waits for the toast to show first, because a toast mounts a moment after
the action that raised it and "no toast" alone would pass before it did. It
then moves the mouse to the top-left corner: a pointer resting on a toast
pauses its timer, and the pointer is usually still on the button that raised
it. Use it before a check that a toast would cover or colour, such as an axe
scan.

## `isMobileProject`

```ts
function isMobileProject(testInfo: TestInfo): boolean; // testInfo.project.use.isMobile
```

```ts
import { isMobileProject } from '@nxgt/playwright/helpers';

test('opens the menu', async ({ page }, testInfo) => {
	await page.goto('/projects');
	if (isMobileProject(testInfo)) {
		await page.getByRole('button', { name: 'Menu' }).click();
	}
	await page.getByRole('link', { name: 'Projects' }).click();
});
```

True for the phone projects `mobile` adds ([config.md](config.md#mobile)), and
for any project built on an `isMobile` device.

## `expectNoHorizontalScroll`

Fails when the page is wider than its viewport — the phone layout that makes
the reader scroll sideways. Meant for the phone projects `mobile` adds
([config.md](config.md#mobile)), and useful at any viewport.

```ts
type NoHorizontalScrollOptions = {
	max?: number; // default 5
	scroller?: string | Locator;
};

function expectNoHorizontalScroll(page: Page, options?: NoHorizontalScrollOptions): Promise<void>;
function formatOverflow(overflow: HorizontalOverflow): string;
```

```ts
import { test } from '@playwright/test';
import { expectNoHorizontalScroll } from '@nxgt/playwright/helpers';

test('projects fit a phone', async ({ page }) => {
	await page.goto('/projects');
	await expectNoHorizontalScroll(page);
});
```

It compares `document.scrollingElement`'s `scrollWidth` with its
`clientWidth`, tolerating one pixel of rounding. On failure it lists the
widest elements whose right edge is past the viewport (at most `max`),
leaving out those inside a box that scrolls or clips sideways (a table in an
`overflow-x: auto` wrapper is fine):

```
The page scrolls horizontally: scrollWidth 640px > clientWidth 412px.
Widest elements past the right edge:
  - table#projects.grid  right 640px, width 624px
  - div.toolbar  right 520px, width 504px
```

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `max` | `number` | `5` | How many offending elements the message lists. |
| `scroller` | `string \| Locator` | none | An inner scroll container to check as well as the document. |

### An app shell that scrolls inside

An app shell as tall as the viewport, whose `main` scrolls, never widens the
document: its sideways overflow is inside the shell, and the document's check
alone passes. Name the container:

```ts
await page.goto('/projects');
await expectNoHorizontalScroll(page, { scroller: 'main' });
```

The first element the selector (or locator) matches is checked after the
document. When nothing matches, such as an error page without the shell, only
the document is checked. A failure names the container:

```
The scroll container main#content.grid scrolls horizontally: scrollWidth 640px > clientWidth 412px.
Widest elements past the right edge:
  - table#projects.grid  right 640px, width 624px
```

`HorizontalOverflow`, the shape `formatOverflow` takes, has an optional
`container` for it.

It checks once, as the page is now: wait for the content (and web fonts,
which change widths) before calling it.

**A page without the viewport meta tag always passes on a phone.** Without
`<meta name="viewport" content="width=device-width, initial-scale=1">`, a
phone lays the page out 980px wide and zooms it out to fit: nothing scrolls,
however wide the content. Add the tag to the app's document.

## `expectNoTextOverflow`

Fails when a text does not fit the box that holds it: a button whose label
runs past its edge, a title cut short by `text-overflow: ellipsis` or a line
clamp with nothing to read it in full. A phone shows them first, and neither
the sideways-scroll check (a clipped text widens nothing) nor axe sees them.

```ts
type TextOverflowOptions = {
	include?: string | readonly string[]; // default: the whole body
	exclude?: string | readonly string[];
	max?: number; // default 5
};

function expectNoTextOverflow(page: Page, options?: TextOverflowOptions): Promise<void>;
function formatTextOverflow(found: OverflowingText[], viewport: { width: number; height: number }, options?: { max?: number }): string;
```

```ts
import { test } from '@playwright/test';
import { expectNoTextOverflow } from '@nxgt/playwright/helpers';

test('labels fit a phone', async ({ page }) => {
	await page.goto('/projects');
	await expectNoTextOverflow(page, { exclude: '.marquee' });
});
```

It waits for web fonts, then compares each text with the box that holds it
(the nearest ancestor that is not `inline`), tolerating one pixel of rounding.
Sideways, the text's rectangles are compared with the box's padding box;
vertically, a box that holds inline content only is compared by `scrollHeight`
and `clientHeight` (a line clamp, or a fixed height). What happens next
depends on the box's `overflow` on that axis:

| `overflow` | Result |
| --- | --- |
| `hidden`, `clip` | `clipped`: fails, unless the box (or an ancestor that holds only its text) has a non-empty `title` or `aria-label`. |
| `visible` | `spills`: always fails, the text runs over what is beside it. |
| `auto`, `scroll` | passes, the reader can scroll to it. |

Not measured: `script`, `style`, `svg`, form controls (`input`, `textarea`,
`select`), `contenteditable`, whatever is not rendered (`display: none`,
`visibility: hidden`, `opacity: 0`) and a text hidden for screen readers only
(`position: absolute` with `clip` or `clip-path`, the usual `sr-only`). A card
that clips a decoration but not its text passes: only text is measured.

Limits: a text under a CSS `transform`, `scale` or `rotate` (on itself or on
an ancestor) is skipped, because its rectangles and its box are then measured
in different coordinate spaces; shadow DOM and iframes are not entered (run the
check on the frame's own page).

```
Text overflows its box in 2 elements (412x839 viewport):
  - span.title  clipped with an ellipsis, no title: "Quarterly report for the…"  312px of text in a 180px box
  - button#save  spills: "Enregistrer les modifications"  160px of text in a 120px box
Let the text wrap, give a clipped one its full text in a title or aria-label, or exclude it.
```

`OverflowingText` is one offender: `selector` (`tag#id.class` of the box),
`text` (the first 40 characters), `kind` (`'clipped'` or `'spills'`),
`ellipsis` (the box has `text-overflow: ellipsis`), `textWidth` and `boxWidth`
in rounded CSS pixels and `axis` (`'x'`, or `'y'` for a box clipped
vertically, where `textWidth` and `boxWidth` hold the heights: `96px of text in
a 48px-tall box`).

The message counts every offender and lists at most `max`.

### Giving a clipped text its full text

```html
<span class="title" title="Quarterly report for the whole group">Quarterly report for the whole group</span>
```

A `title` or an `aria-label` on the box, or on a link or button around it that
holds nothing else, is enough. A tooltip a script draws is not a `title`: add
the attribute as well, or `exclude` the box. Text you let wrap needs nothing.

An `include` that matches no element throws
(``expectNoTextOverflow: `include` matched no element (<selectors>)``) instead
of passing: a typo would otherwise turn the check off. A list passes the test
as soon as one of its selectors matches.

`checkScreen` runs it with `textOverflow` ([screens.md](screens.md#one-call-per-screen-checkscreen)).
It checks once, as the page is now: wait for the content first.

## `expectTapTargets`

Fails when a link, a button or a form control is smaller than a thumb:
**44x44 CSS pixels** by default, the size of a comfortable touch target, in
the page's own pixels whatever the device pixel ratio. The icon button that
fits a mouse and gets missed on a phone is the usual find.

> **24px is axe's, not this check's.** WCAG 2.5.8 (Target Size, Minimum) asks
> for 24x24px, or enough spacing around a smaller target. That is axe's
> `target-size` rule, which `expectAccessible` and so `checkScreen`'s default
> scan already run, on phones too. `expectTapTargets` is the stricter,
> comfortable-touch size (44px is WCAG 2.5.5, level AAA, and the size platform
> guidelines recommend), so it is off by default in `checkScreen`. Pass
> `size: 24` for the WCAG minimum without its spacing exception.

```ts
type TapTargetOptions = {
	size?: number; // default 44
	spacing?: boolean; // default false
	hitArea?: boolean; // default true
	targets?: string | readonly string[]; // default DEFAULT_TAP_TARGETS
	include?: string | readonly string[]; // default: the whole document
	exclude?: string | readonly string[];
	max?: number; // default 5
};

function expectTapTargets(page: Page, options?: TapTargetOptions): Promise<void>;
function formatTapTargets(found: SmallTapTarget[], viewport: { width: number; height: number }, options?: { size?: number; max?: number }): string;
const DEFAULT_TAP_TARGETS: readonly string[];
```

```ts
import { test } from '@playwright/test';
import { expectTapTargets } from '@nxgt/playwright/helpers';

test.use({ viewport: { width: 412, height: 839 } });

test('tap targets fit a thumb', async ({ page }) => {
	await page.goto('/projects');
	await expectTapTargets(page, { exclude: '.legal a' });
});
```

What counts as a tap target (`DEFAULT_TAP_TARGETS`): `a[href]`, `button`,
`input` (not `hidden`), `select`, `textarea`, `summary`, the roles `button`,
`link`, `checkbox`, `radio`, `switch`, `tab`, `menuitem` and `option`, anything
with a `tabindex` other than `-1`, and anything with an `onclick` attribute.
`targets` replaces the list (spread `DEFAULT_TAP_TARGETS` to add to it); an
empty list throws (``expectTapTargets: `targets` is empty``). An `include` that
matches no element throws too, instead of measuring nothing and passing.
A checkbox or radio is measured together with its labels (a tap on the label
toggles it), so a small box inside a 44px row passes. The input and its
labels count as one bounding box, so a `for` label far from its input
includes the gap between them.

Not measured: elements that are hidden (`display: none`, `visibility:
hidden`), zero-sized, visually hidden (`sr-only`: a 1px box, or `clip` /
`clip-path` on an absolute box, such as a skip link), `disabled`, `aria-disabled="true"`, `inert` or under
`pointer-events: none`; while a modal layer is open (a modal `<dialog>`, a
shown `aria-modal="true"` element, or a body with `pointer-events: none`, as
a modal Radix menu leaves it), anything under `aria-hidden="true"`, the page
the layer hides; an undersized target a layer covers (see
[the real hit area](#the-real-hit-area-hitarea-on-by-default)); and a link inside a sentence: an `inline` link with
text of its own beside it in its block container, looking through inline
wrappers (`<p><strong><a>x</a></strong> text</p>`; WCAG 2.5.8's inline
exception). Only inline links are exempt: an `inline-block` link is measured,
and so is the same link alone in its paragraph or list item. A target passes when its box
is at least `size` by `size`, within half a pixel of rounding, or when its
invisible hit area fills that square (see [the real hit
area](#the-real-hit-area-hitarea-on-by-default)).

`spacing: true` adds the spacing exception at this `size`: a smaller target
passes when a circle of `size` diameter centred on it touches no other target
and no other undersized target's circle. A target that contains it, or sits
inside it, is the same control, not a neighbour. The failure names the
neighbour.

```
3 tap targets are smaller than 44x44px (412x839 viewport):
  - button#close.icon "Close"  32x32px
  - a.nav-link "Home"  60x24px
  - input "Remember me"  16x16px, too close to a.forgot
Make each at least 44x44px (padding, or min-width and min-height, on the element itself), or exclude it.
```

`SmallTapTarget` is one offender: `selector` (`tag#id.class`), `name` (its
label), `width` and `height` in rounded CSS pixels, and with `spacing` `near`,
the selector of the target that crowds it.

The size is the element's border box, as `getBoundingClientRect` reports it:
grow it with `padding`, or `min-width` and `min-height`, on the element
itself, or give it a hit area (below).

### The real hit area (`hitArea`, on by default)

A design system draws a
checkbox, a switch, a radio or a toast's close button small and gives it an
invisible 44px `::before` / `::after`, often under `@media (pointer: coarse)`.
The box stays small, the thumb does not miss it. For a target whose box is
smaller than `size` in either dimension and that could have a larger hit area,
the check probes the `size` by `size` square centred on the box with
`document.elementFromPoint`, on a 5x5 grid (points 1px inside the square's
edges). The target passes when every probe hits
the target itself, one of its descendants (a pseudo-element hit-tests as its
element), or, for a checkbox or radio, one of its labels or their descendants.
The square is centred on the target's box, joined with its labels' for a
checkbox or radio.

What makes an undersized target a candidate for the probe: a `::before` or
`::after` with `content` on it, on its checkbox or radio labels, or on a
descendant; a descendant drawn outside its box (an absolutely positioned child
with a negative inset); a custom element (a tag with a `-`) as the target,
inside it or in a checkbox's or radio's label, or a shadow root, since what a shadow tree draws cannot be read
from the box. Every other undersized target is judged on its box alone, which
is also its hit area. With `spacing`, such a target is not counted as undersized;
its neighbours still judge it by its visible box.

So the pseudo-element has to be hit-testable: not `pointer-events: none`, not
covered by a neighbour (a floating layer excepted, below), not clipped by an ancestor's `overflow`, and as large
as `size`.
Under `@media (pointer: coarse)` it counts in a mobile project (`defineAppConfig`'s `mobile`, a Pixel
7 with touch, emulates `pointer: coarse`) and not in a desktop one, which is
the point of running the check on phones.

A target that is off screen, whose square sticks out of the viewport, that
is scrolled out of the visible area of a scrolling ancestor, or that something
covers where it sits (a form's sticky actions bar, a sticky header), is
scrolled to the middle (`scrollIntoView({ block: 'center', inline: 'center' })`,
without smooth scrolling) for the probe, and the window and every scrolled
ancestor (through slots and shadow roots) are put back where they were, so the
page the next check sees is the one you had. Scroll listeners on the page fire
for the two moves. A square that still sticks out (a control fixed at the
page's edge) is moved inside the viewport, without a classic scrollbar, not
cut: a full `size` square of hit area must be on screen. A target is probed at
the current scroll position first; only when that probe misses is it scrolled
and probed again. A neighbour over part of its square still fails it; a
floating layer does not. That is an element with a `role` attribute of `menu`,
`listbox`, `dialog`, `alertdialog`, `tooltip`, `status` or `alert`, an open
popover or an open `<dialog>`, that does not hold the target and floats (in the
top layer, or `fixed` / `absolute`, itself or an ancestor; an inline
`role="alert"` error in the flow is a neighbour). The probe measures through it,
making what it hit transparent to the pointer (`pointer-events: none`) for the
probe and putting its `style` attribute back, so a checkbox beside an open menu
is judged on its real hit area. A target a layer hides whole is still covered
(below), not measured through. A
viewport smaller than `size` falls back to the box.

A control out of reach in the state you check is not judged at all: any
undersized target (with or without a hit area of its own) that another
element still covers once scrolled to the middle, at the centre of each of its
boxes (each line of a wrapped link) and of its labels (a checkbox tapped
through its `for` label is in reach). That is a row
checkbox under a toast or behind an open modal menu's layer, the buttons of a
toast stacked behind the front one, anything under a sheet over the whole
page, a closed off-canvas drawer. A control a stretched link (an `::after`
over a whole card) sits on is covered too, so it is not judged either. It is neither reported nor counted as a neighbour for `spacing`; check
it in the state where it is shown. A layer's own controls (the menu's items,
the front toast's buttons) are judged as usual.

`hitArea: false` restores the 0.8 behaviour: the visible box only, and no
scrolling.

The message counts every offender and lists at most `max`. Run it on a phone
viewport: a desktop layout has small targets on purpose, which is why
`checkScreen` takes `tapTargets` as a function of the test
([screens.md](screens.md#one-call-per-screen-checkscreen)).

**A page without the viewport meta tag measures a zoomed-out page.** A phone
lays a page without `<meta name="viewport" content="width=device-width,
initial-scale=1">` out 980px wide and shrinks it to fit, so the targets are
measured at their layout size, 44px of CSS, but the person sees them at
roughly 40% of that. Add the tag to the app's document first.

## `screenshotName`

The slug `BasePage.screenshot()` names its files with.

```ts
function screenshotName(path: string, suffix?: string): string;
```

```ts
import { screenshotName } from '@nxgt/playwright/helpers';

screenshotName('/projects/42'); // 'projects-42'
screenshotName('/a/b?tab=1#top'); // 'a-b'
screenshotName('/'); // 'index'
screenshotName('/auth/login', '01'); // 'auth-login-01'
```

Useful when a screenshot is taken outside a page object, or for a visual
comparison named like the page files:

```ts
await expect(page).toHaveScreenshot(`${screenshotName('/projects')}.png`);
```

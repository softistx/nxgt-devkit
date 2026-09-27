# Storybook

`storybookProject` turns your Storybook stories into Vitest browser tests —
each story rendered in a headless Chromium, through
`@storybook/addon-vitest` — and, with `capture`, saves a cropped WebP preview
of every component whose story is tagged `preview`.

```ts
// vite.config.ts (or vitest.config.ts)
import { storybookProject } from '@nxgt/playwright/storybook';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [storybookProject()],
	},
});
```

```bash
bunx vitest run --project storybook
```

Every story that renders without throwing (and whose `play` function, if any,
passes) is a passing test.

## Browsers

The packages are in the README's Install section — for this subpath,
`vitest`, `@vitest/browser-playwright`, `@storybook/addon-vitest` and
`playwright` (a required peer of `@vitest/browser-playwright`, and where the
CLI below comes from). `@playwright/test` is not needed: Vitest drives
Playwright through `@vitest/browser-playwright`. Then download the browser
that matches the installed `playwright`:

```bash
bunx playwright install chromium-headless-shell
```

## `storybookProject`

```ts
import type { TestProjectInlineConfiguration } from 'vitest/config';

type StorybookProjectOptions = {
	name?: string;
	configDir?: string;
	tags?: { include?: string[]; exclude?: string[]; skip?: string[] };
	capture?: boolean | PreviewCaptureOptions;
	viewport?: { width: number; height: number };
	executablePath?: string;
	setupFiles?: string[];
};

function storybookProject(options?: StorybookProjectOptions): TestProjectInlineConfiguration;
```

The project it returns:

- `extends: true` — it inherits the root config's plugins (your framework's,
  Tailwind's), aliases and `define`, so stories build like the app;
- `plugins: [storybookTest({ configDir, tags })]` from
  `@storybook/addon-vitest/vitest-plugin`;
- `test.browser`: enabled, headless, one `chromium` instance through
  `@vitest/browser-playwright`, at `viewport`;
- `test.setupFiles`: this package's `storybook/setup` first (it registers
  the capture `afterEach`), then yours;
- `test.provide`: the capture options, or `false`.

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `name` | `string` | `'storybook'`, or `'previews'` with `capture` | The Vitest project name, for `--project`. |
| `configDir` | `string` | `'.storybook'` | Storybook's config folder. |
| `tags` | `{ include?, exclude?, skip? }` | none | Filters stories by tag, as `storybookTest` does. With `capture`, the capture tag is appended to `include`. |
| `capture` | `boolean \| PreviewCaptureOptions` | `false` | Capture previews; only stories carrying the capture tag run. `true` = all capture defaults. |
| `viewport` | `{ width, height }` | `{ width: 1280, height: 800 }` | The browser viewport, in CSS px. |
| `executablePath` | `string` | `$PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | A Chromium to launch instead of Playwright's download. |
| `setupFiles` | `string[]` | `[]` | Extra setup files, run after the package's own. |

### Skip stories that cannot render headless

```ts
storybookProject({ tags: { exclude: ['no-test'] } });
```

```tsx
export const WithCamera: Story = { tags: ['no-test'] };
```

### A system Chromium (Arch, Manjaro)

Playwright ships no Chromium build for some distributions. Point it at the
one the system package manager installed, either in the config:

```ts
storybookProject({ executablePath: '/usr/bin/chromium' });
```

or, better, per machine, leaving the config portable:

```bash
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
```

## Previews: `capture`

```ts
storybookProject({ capture: true });
```

A second project, named `previews`, that runs only the stories tagged
`preview` and, after each one, writes `docs/previews/<component id>.webp`
under the Vitest project root.

Tag **one** story per component — the one that shows it best:

```tsx
// src/components/text-field.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextField } from './text-field';

const meta = {
	title: 'Form fields/TextField',
	component: TextField,
} satisfies Meta<typeof TextField>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { label: 'Name' },
	tags: ['preview'], // → docs/previews/form-fields-textfield.webp
};

export const WithError: Story = { args: { label: 'Name', error: 'Required' } };
```

The file is named after the **component**, not the story, so a docs page can
find it from the title alone. Two tagged stories of one component write the
same file; the last one captured wins. A `tags: ['preview']` on `meta` tags
every story — avoid it.

### How a preview is made

After each tagged story, in the browser:

1. waits for `document.fonts.ready`, then `settle` ms more, for animations and
   lazily loaded content;
2. screenshots `document.body` through Vitest's `page.screenshot`, keeping
   the PNG in memory;
3. finds the **painted** box: the union of every visible element that has
   text of its own, is media (`svg`, `img`, `canvas`, `video`, `input`,
   `textarea`, `button`, `iframe`), or has a background colour or image, a
   box shadow, or a top or left border. Hidden, `display: none`,
   `opacity: 0` and zero-sized elements are ignored. Portals — menus, dialogs,
   toasts — are in `body` too, so an open menu is inside the crop;
4. crops the screenshot to that box plus `padding` (converting CSS px to
   device pixels), and to the whole screenshot when nothing is painted;
5. scales it down to `maxWidth` if wider, and encodes WebP at `quality`
   through a `<canvas>` — in the browser, so no native image library is
   installed;
6. writes it with Vitest's `commands.writeFile`, which creates `dir` when
   missing.

A small button therefore comes out as a small image, not a 1280×800 blank
page with a button in the corner.

### `PreviewCaptureOptions`

```ts
type PreviewCaptureOptions = {
	dir?: string;
	tag?: string;
	padding?: number;
	maxWidth?: number;
	quality?: number;
	settle?: number;
};
```

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `dir` | `string` | `'docs/previews'` | Output folder, relative to the Vitest project root. |
| `tag` | `string` | `'preview'` | Only stories carrying this tag run, and are captured. |
| `padding` | `number` (CSS px) | `24` | Space kept around the painted box. |
| `maxWidth` | `number` (px) | `960` | Wider crops are scaled down to this width. |
| `quality` | `number` (0–1) | `0.82` | WebP quality. |
| `settle` | `number` (ms) | `600` | Wait after fonts are ready, before the screenshot. |

```ts
storybookProject({
	capture: { dir: 'public/previews', tag: 'docs', padding: 16, quality: 0.9 },
});
```

## A realistic setup

Unit tests in Node, every story as a smoke test, and previews on demand:

```ts
// vite.config.ts
import { storybookProject } from '@nxgt/playwright/storybook';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [react()],
	test: {
		projects: [
			{
				extends: true,
				test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'] },
			},
			storybookProject({ tags: { exclude: ['no-test'] } }),
			storybookProject({ capture: true }),
		],
	},
});
```

```jsonc
// package.json
{
	"scripts": {
		"test": "vitest run --project unit",
		"test:stories": "vitest run --project storybook",
		"docs:previews": "vitest run --project previews"
	}
}
```

Run each project by name. A bare `vitest run` runs all three — including
`previews`, which rewrites every WebP.

Commit `docs/previews/` to show them on the npm page or a docs site; ignore
it to keep them local. Either way, `docs:previews` regenerates them from the
current stories.

### Linking a preview from its title

`componentId` and `titleToComponentId` compute the file name Storybook's own
ids produce, from a story id or from a title:

```ts
import { componentId, titleToComponentId } from '@nxgt/playwright/storybook';

componentId('form-fields-textfield--default'); // 'form-fields-textfield'
titleToComponentId('Form fields/TextField'); // 'form-fields-textfield'
titleToComponentId('Buttons & actions/Button'); // 'buttons-actions-button'

const src = `/previews/${titleToComponentId('Rich widgets/Charts/BarChart')}.webp`;
```

Both are also exported from `@nxgt/playwright/storybook/capture`, for code
that runs in the browser.

## The browser-only subpaths

`@nxgt/playwright/storybook/setup` is the setup file `storybookProject`
registers: it only calls `afterEach(capturePreview)`. You do not import it.

`@nxgt/playwright/storybook/capture` exports `capturePreview`, the `afterEach`
itself. It reads its options from what `storybookProject({ capture })`
provides, so it does nothing in a project made any other way, and it is already
registered in every project `storybookProject` makes.

Both import `vitest/browser` and touch `document`: importing either from a
config file or from Node fails.

## When the preview is not written

- **The story has no `preview` tag** (or the project was made without
  `capture`): nothing is captured, by design.
- **The browser server is exposed to the network** (`test.browser.api.host`):
  Vitest disables file writes, and the test fails with
  `Cannot modify file "docs/previews/…"`.
- **`dir` is outside the project root** and outside Vite's `server.fs.allow`:
  Vitest refuses the write with `Access denied to "…"`.

More in [troubleshooting.md](../troubleshooting.md).

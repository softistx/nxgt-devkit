#!/usr/bin/env bun

/**
 * Runs `@nxgt/playwright/msw`'s specs against the lowest msw and
 * `@msw/playwright` its peer ranges accept, in a scratch copy of the
 * workspace:
 *
 *   bun run scripts/test-lower-peers.ts                 # 2.12.10 and 0.6.7
 *   bun run scripts/test-lower-peers.ts 2.12.10 0.6.7   # the same, explicit
 *
 * The workspace holds msw 3 and `@msw/playwright` 0.7, and the peers promise
 * `msw ^2.12.10 || ^3` with `@msw/playwright >=0.6.7 <0.8`, so the other end
 * is measured here and in CI rather than assumed. Pass full versions: the
 * `ok:` line prints what was installed.
 *
 * The copy keeps `bun.lock`, so everything else stays at the version the
 * workspace tests (the Chromium in the shared browser cache included); only
 * the two peers move. It then builds, typechecks the package and runs
 * `test/e2e/msw.pw.ts`, the one spec that imports `./msw`.
 *
 *   bun run scripts/test-lower-peers.ts --playwright 1.61.1
 *
 * The other leg: `@playwright/test` is promised as `^1.61.0` and the workspace
 * holds a newer one, so the bottom of that range is measured the same way.
 * Only `@playwright/test` and `@nxgt/msw-graphql`'s copy of it move (msw stays
 * where the lockfile has it). This leg downloads its own browser, the
 * headless shell that version needs, into the shared cache (it is not the
 * workspace's), and the whole package runs: build, typecheck, the unit specs and both Playwright
 * configs. Pass the newest patch of the floor's minor. `--grep <title>` runs
 * only the e2e tests that match, to find which minor a failing one starts to
 * pass on.
 *
 *   bun run scripts/test-lower-peers.ts --vitest 4.0.18 --storybook 10.3.6
 *
 * The third leg measures `@nxgt/playwright/storybook`'s floors: `vitest` and
 * `@vitest/browser-playwright` move to `--vitest`, `@storybook/addon-vitest`,
 * `storybook` and `@storybook/html-vite` to `--storybook`, and `vite` to
 * `--vite` (default 7.3.7: vitest 4.0 accepts vite 6 or 7 only). Playwright
 * stays at the lockfile's, so the cached Chromium is used. It builds,
 * typechecks (a missing per-browser type fails here), runs `src/storybook`
 * and the `test/storybook/` fixture. Pass the newest patch of each floor.
 *
 * Modelled on `@nxgt/msw-graphql`'s `scripts/test-matrix.ts`. The work is in
 * `lower-peers/`: `options.ts` (the arguments), `legs/` (one file per leg) and
 * `index.ts` (the scratch copy, the signal handler, the runner).
 */

import { main } from './lower-peers';

await main(Bun.argv.slice(2));

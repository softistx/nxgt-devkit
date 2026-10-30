---
'@nxgt/playwright': minor
---

Export `tapTargetVerdict(el, options?)` from the new `@nxgt/playwright/tap-targets` subpath: the 44px tap-target verdict of `expectTapTargets` and `checkScreen`, for one element, in the browser (a Storybook play, a Vitest browser test), with no Node import. `expectTapTargets` now runs this very function in the page for its hit-area probe, so there is one source of the logic. `probeHitAreas` is now the source of an in-page function (internal) and `measure` no longer returns `probe`.

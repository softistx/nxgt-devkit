---
'@nxgt/playwright': minor
---

`expectTapTargets` in `/helpers` (and the root): links, buttons and controls of at least 44x44 CSS pixels, and `checkScreen`'s `tapTargets` option (off by default; `true`, an options object, or a function of the test for phone-only). WCAG 2.5.8's 24px stays axe's `target-size`, which `expectAccessible` already runs.

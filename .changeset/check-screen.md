---
'@nxgt/playwright': minor
---

Add `checkScreen` to `@nxgt/playwright/screens`: one call per screen that waits for web fonts and motion, saves the screen when the run saves them (before the checks, so a failing one still leaves the image), then runs the accessibility scan and the no-sideways-scroll check. `a11y` takes `expectAccessible`'s options, a function that replaces the scan, or `false`; `scroller` is a selector or a function of the test (a phone project can name another one); `@axe-core/playwright` is loaded only when the default scan runs.

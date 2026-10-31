---
'@nxgt/playwright': patch
---

Fix `checkScreen` with `pointer: 'coarse'` judging tap targets with a fine pointer when the run saves screens (`SCREENS=1`) and the page is taller than the viewport: the full-page screenshot of `saveScreen` turned Chromium's touch emulation off, so `(pointer: coarse)` was false at tap-target time. `saveScreen` now puts the coarse pointer back after the screenshot.

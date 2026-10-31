---
'@nxgt/playwright': minor
---

Add a `viewport` option to `saveScreen` and `checkScreen` (`@nxgt/playwright/screens`): `saveScreen(page, testInfo, 'items-phone', { viewport: { width: 390, height: 844 } })` resizes the page, saves the screen, then restores the previous viewport, also when the save throws. On `checkScreen` the whole call runs at that size, so the sideways-scroll, axe, text-overflow and tap-target checks judge the phone layout. `withViewport(page, viewport, run)` is exported for the same resize-and-restore around code of your own.

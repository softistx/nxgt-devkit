---
'@nxgt/playwright': minor
---

Add a `pointer` option to `checkScreen` (`@nxgt/playwright/screens`): `pointer: 'coarse'` judges the screen with a finger from a desktop Chromium project, so `@media (pointer: coarse)` matches and a component library that enlarges its tap targets there is measured at the size a phone gets (`checkScreen(page, testInfo, 'home', { viewport: PHONE, tapTargets: true, pointer: 'coarse' })`). It applies CDP `Emulation.setTouchEmulationEnabled` for the call and disables and detaches it afterwards, also when a check throws. On headless Chromium without a pointing device (Linux CI) the page then reports `hover: none` and `pointer: none` until its next navigation, so make it the page's last check or reload after it. On Firefox and WebKit it throws before anything runs. `withPointer(page, pointer, run)` is exported for the same around code of your own.

---
'@nxgt/playwright': minor
---

The `@playwright/test` peer range moves from `^1.55.0` to `^1.61.0`. Below 1.61, `context.setOffline(true)` does not reach a service worker's own fetches, so after `goOffline(page)` a fetch of an uncached URL still answers `200`; CI now runs the whole package on 1.61.1 to hold that floor. If you are on an older Playwright, upgrade it.

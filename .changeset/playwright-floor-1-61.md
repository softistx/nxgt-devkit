---
'@nxgt/playwright': minor
---

The `@playwright/test` peer range moves from `^1.55.0` to `^1.61.0`. Below 1.61, `context.setOffline(true)` does not reach a service worker's own fetches, so after `goOffline(page)` (`@nxgt/playwright/pwa`) a fetch of an uncached URL still answers `200`. Upgrade `@playwright/test` to 1.61 or newer.

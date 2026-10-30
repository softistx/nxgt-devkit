---
'@nxgt/playwright': minor
---

Export `withOverlaysInFlow(page, selectors, run)` from `@nxgt/playwright/a11y`: it puts sticky or fixed bars (for example `DEFAULT_UNSTICK`) back in the flow while `run` executes, then restores their inline `position`. Use it around a full-page screenshot of a page with a sticky form-actions bar. It was already used by the accessibility scan but not exported.

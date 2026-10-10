---
"@nxgt/playwright": minor
---

Accessibility checks and phone projects.

- **`@nxgt/playwright/a11y`** (new subpath; install the new optional peer
  `@axe-core/playwright`): `expectAccessible(page, options?)` runs axe with the
  WCAG 2.2 A/AA tags and fails with each violated rule, its impact, help link
  and first nodes, attaching the full report to the test as
  `accessibility-scan.json`. Options: `include`, `exclude`, `tags`, and
  `disableRules`, where each rule is given with a reason
  (`{ rule: 'color-contrast', reason: '…' }`, enforced by the types).
  `accessibilityScan` returns the results without asserting, `withA11y(test)`
  adds an `a11y` fixture, and `formatViolations` builds the message.
- **`defineAppConfig({ mobile })`**: `true` adds a Pixel 7 project on Chromium
  named `mobile-chromium`; an array takes any of Playwright's devices
  (`['Pixel 7', 'iPhone 14']` → `mobile-chromium`, `mobile-webkit`). Mobile
  projects come after the desktop `browsers` and depend on the `setup` project
  like them.
- **`expectNoHorizontalScroll(page)`** in `/helpers`: fails when the page
  scrolls sideways, naming the widest elements past the right edge.

Nothing changes for an existing config: `mobile` is off by default, and the
root `@nxgt/playwright` does not re-export `/a11y`.

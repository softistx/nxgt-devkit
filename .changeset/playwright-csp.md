---
'@nxgt/playwright': minor
---

Add `@nxgt/playwright/csp`: `watchCsp` and `withCspGuard` / `cspTest` fail a test whose pages meet a Content-Security-Policy refusal, and `expectNoncedPage` checks that a page's `script-src` names a fresh nonce that every script and module preload carries.

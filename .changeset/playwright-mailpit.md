---
'@nxgt/playwright': minor
---

Add `@nxgt/playwright/mailpit`: `mailpit({ url })` reads mail from a local Mailpit in e2e tests. `waitForLink({ to, match, timeout, interval })` polls the newest message to an address until a link matching the pattern appears and returns it absolute (`&amp;` decoded), `latest({ to })` returns the newest message and its links, `clear()` empties the inbox. The URL defaults to `E2E_MAILPIT_URL`, then `http://localhost:8025`. It uses `fetch` only: no new dependency and no peer.

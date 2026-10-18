---
"@nxgt/playwright": patch
---

`expectTapTargets`: a control covered where it sits (under a form's sticky actions bar) is scrolled to the middle and probed again instead of failing at its own size; only a control still covered there fails.

---
"@nxgt/playwright": patch
---

`expectTapTargets`: a target scrolled into view for the hit-area probe whose probe misses is probed once more two frames later, once the page's scroll listeners have moved their layers (a menu in a `fixed` popper that follows its anchor), and the page settles again after the scroll is put back. The last rows of a long page no longer fail against where an open menu was before the scroll. A target that passes at once costs no wait.

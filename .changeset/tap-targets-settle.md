---
"@nxgt/playwright": patch
---

`expectTapTargets`: a target scrolled into view for the hit-area probe whose probe misses is probed once more two frames later, once the page's scroll listeners have moved their layers (a menu in a `fixed` popper that follows its anchor), and the page settles again after the scroll is put back. The last rows of a long page no longer fail against where an open menu was before the scroll. Only a miss under a positioned layer (`fixed`, `absolute`, `sticky`) waits, a layer seen not to move is not waited for again, and a retry never turns a reached target into a covered one.

---
'@nxgt/playwright': minor
---

`expectTapTargets` (and `checkScreen`'s `tapTargets`) now measure the real hit area, not only the visible box. A checkbox, switch, radio or close button drawn at 20px with an invisible 44px `::before` / `::after` (often under `@media (pointer: coarse)`) passes, as long as the pseudo-element is hit-testable: every point of a 5x5 grid over the 44px square centred on the control must hit the control, its descendants or its labels. A control off screen is scrolled into view for the probe and the scroll positions are put back. `hitArea: false` restores the previous behaviour, the visible box only. The failure message is unchanged.

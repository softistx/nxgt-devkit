---
"@nxgt/playwright": patch
---

`expectTapTargets`: an undersized control that another element still covers once scrolled to the middle, at the centre of each of its boxes and labels (a row checkbox under a toast or behind a modal menu's layer, the buttons of a toast stacked behind the front one, anything under a full-page sheet) is out of reach in that state and no longer judged, instead of being reported at its drawn size. A neighbour over part of a hit area still fails it; `hitArea: false` keeps the visible-box check.

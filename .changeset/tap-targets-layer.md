---
"@nxgt/playwright": patch
---

`expectTapTargets`: a floating layer over part of a hit area (an element with the role `menu`, `listbox`, `dialog`, `alertdialog`, `tooltip`, `status` or `alert`, or an open popover, that does not hold the target) is measured through: what it put under the probe is made transparent to the pointer for the probe and put back, so a checkbox beside an open non-modal menu is judged on its real hit area. A neighbour without such a role over part of the square still fails it.

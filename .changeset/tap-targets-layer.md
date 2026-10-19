---
"@nxgt/playwright": patch
---

`expectTapTargets`: a floating layer over part of a hit area (an element with a `role` of `menu`, `listbox`, `dialog`, `alertdialog`, `tooltip`, `status` or `alert`, an open popover or `<dialog>`, positioned `fixed` / `absolute` or in the top layer, that does not hold the target) is measured through: what it put under the probe is made transparent to the pointer for the probe and put back, so a checkbox beside an open non-modal menu is judged on its real hit area. A neighbour without such a role, or in the flow (an inline `role="alert"` error), over part of the square still fails it; a target a layer hides whole stays covered and not judged.

---
"@nxgt/playwright": patch
---

`expectTapTargets`: while a modal layer is open (a modal `<dialog>`, a shown `aria-modal="true"` element, or a body with `pointer-events: none`, as a modal Radix DropdownMenu leaves it), a control under `aria-hidden="true"` is out of reach and not measured, even where the layer does not cover it. The layer's own controls are still judged; `aria-hidden` with no modal layer open hides nothing from the check.

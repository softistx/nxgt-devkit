---
"@nxgt/playwright": patch
---

`expectTapTargets` measures through the positioned wrapper of a floating layer (a popper's content wrapper, `fixed` or `absolute`, holding only a menu, listbox, dialog or the like down a chain of single children) as it does through the layer itself, so a non-modal menu over the top of a link's hit area no longer fails the link at its box size. A positioned element that holds other content beside a layer, or only a layer that is not shown (a closed menu, an empty live region), is still a neighbour.

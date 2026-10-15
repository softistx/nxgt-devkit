---
'@nxgt/playwright': minor
---

`expectTapTargets`, `formatTapTargets(found, viewport, { size, max })` and `DEFAULT_TAP_TARGETS` in `/helpers` (and the root), with the types `TapTargetOptions` and `SmallTapTarget`: links, buttons and controls of at least 44x44 CSS pixels, and `checkScreen`'s `tapTargets` option (off by default; `true`, an options object, or a function of the test for phone-only). WCAG 2.5.8's 24px stays axe's `target-size`, which `expectAccessible` already runs. An empty `targets`, or an `include` matching no element, throws a named error. The size is the element's border box: grow it with padding or `min-width` / `min-height`.

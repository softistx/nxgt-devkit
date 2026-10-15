---
'@nxgt/playwright': minor
---

`expectNoTextOverflow` and `formatTextOverflow(found, viewport, { max })` in `/helpers` (and the root), with the types `TextOverflowOptions` and `OverflowingText`, and `checkScreen`'s `textOverflow` option (off by default; `true`, an options object, or a function of the test for phone-only). An `include` matching no element throws instead of passing.

---
"@nxgt/playwright": patch
---

The `@msw/playwright` peer range is now `>=0.6.7 <0.7`. `@msw/playwright`
0.7.0 requires msw 3, so an install that resolved it beside msw 2 failed to
load `@nxgt/playwright/msw` with `Cannot find package 'msw'`.

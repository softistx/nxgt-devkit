---
'@nxgt/playwright': minor
---

`storybookProject({ browsers })` runs the stories in Chromium, Firefox and/or WebKit, one Vitest browser instance each (default `['chromium']`, so nothing changes). `executablePath` applies to the `chromium` instance only and throws when `browsers` has no `chromium`. New type `StorybookBrowser`.

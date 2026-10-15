---
'@nxgt/playwright': minor
---

`storybookProject({ browsers })` runs the stories in Chromium, Firefox and/or WebKit, one Vitest browser instance each (default `['chromium']`, so nothing changes). `executablePath` applies to the `chromium` instance only and throws when `browsers` has no `chromium`. New type `StorybookBrowser`. `capture` with more than one browser throws (they would write the same preview file). The returned project's `test.browser.provider` is now a bare `playwright()`: the Chromium `executablePath` moved to the `chromium` instance's own `provider` (the launched browser is the same), so code that reads `provider.launchOptions` on the project reads the instance instead.

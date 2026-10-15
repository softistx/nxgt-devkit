---
'@nxgt/playwright': patch
---

`storybookProject({ capture, browsers })` with `webkit` now throws at config time, and the capture throws if a browser answers with a non-WebP image. WebKit cannot encode WebP: it silently returned PNG data, which was written under a `.webp` name. Capture with `chromium` or `firefox`.

The capture also names an empty or oversized canvas (`toDataURL` answers `"data:,"`) with its width and height, instead of blaming the browser.

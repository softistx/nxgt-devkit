---
'@nxgt/playwright': minor
---

`expectAccessible` and `accessibilityScan` put sticky form actions (`[data-slot="form-actions"]`) back in the flow while axe runs, then restore them, so `target-size` no longer reports a control half covered by the bar wherever the page stops scrolling. Add your own bars with the new `unstick` option (`[...DEFAULT_UNSTICK, '.app-bottom-bar']`); `unstick: []` turns it off.

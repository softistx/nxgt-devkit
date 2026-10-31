---
'@nxgt/playwright': minor
---

Add a dev-server warm-up: `defineAppConfig({ warmUp: { path: '/sign-in' } })` opens the path in Chromium once before the specs and reloads it until it hydrates (`reloadEvery`, default 15 s; `timeout`, default 3 min; `marker`, the one `withHydration` takes), then fails naming the URL. A cold Vite server answers 504 "Outdated Optimize Dep" to the first page and that page never hydrates. The `warmUp(baseURL, options)` helper does the same from a `globalSetup` of your own. The warm-up chains after the screens' global setup.

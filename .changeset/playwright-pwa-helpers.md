---
"@nxgt/playwright": minor
---

PWA end-to-end helpers in `@nxgt/playwright/pwa`: a production-build run, offline, a new worker version and what the caches keep.

- **`pwaProject(options)`**: the `defineAppConfig` options of a run that is the PWA project alone — `bun run build && bun run start` (both configurable) on a port of its own with `PORT` set and no mocks, awaited on `readyPath`, and one `pwa` project in Chromium with service workers allowed, its specs in `./playwright/pwa`. **`isPwaRun()`**: `--project pwa` (the same answer in the workers) or `PWA=1`.
- **`goOffline(page, options?)`** and **`goOnline(page)`**: `context.setOffline`, once a service worker controls the page (`{ worker: false }` for an app without one).
- **`nextWorkerVersion(page, { file })`**: a new version of the worker, as a deploy would make one — the script on disk edited, `registration.update()`, the file restored — resolving once the new worker has installed, and saying why when no new worker appears or it fails to install.
- **`fillCaches(page, names)`** puts one entry in each named cache; **`expectOnlyCaches(page, keep)`** fails unless only the caches `keep` names (exact names, patterns or predicates) are left, naming the extra and the missing ones. `cacheProblems` and `filledCacheUrl` are the pure parts.
- `cachedUrls` (and so `expectNotCached`) now says when the page has no Cache Storage (`about:blank`, a non-secure origin) instead of failing on `caches`.

Nothing changes for an existing suite: every addition is opt-in.

---
"@nxgt/msw-graphql": minor
---

`startMockServer` is idempotent per process: a second call returns the first call's `{ server, control }` (kept on `globalThis` under `Symbol.for('@nxgt/msw-graphql/node')`), so an SSR entry module re-evaluated under HMR no longer stacks listeners. The second call's handlers and options are ignored; `server.close()` forgets the server so the next call starts a new one.

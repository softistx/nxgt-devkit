---
'@nxgt/msw-graphql': minor
---

`startMockServer` now intercepts `fetch` under Bun with msw 3. msw 3's `setupServer` patches `node:net`, which Bun's `fetch` never reaches (mswjs/msw#2811, closed as expected behaviour), so under Bun it built a server that mocked nothing. Under Bun with msw 3 the server is now a `defineNetwork` network (`msw/experimental`) on msw's `fetch/web` interceptor, with the same `{ server, control }`. Node and msw 2 are unchanged. If a later msw 3 minor moves what this relies on, it throws an error naming the missing export. Under Bun it patches `globalThis.fetch` only, so a `node:http` client is not mocked there; `createMockFetch` still covers it.

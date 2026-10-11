---
"@nxgt/playwright": minor
---

Add `@nxgt/playwright/mock-server`: `createMockServerTest(base, { path })` gives a
`mockServer` fixture (`reset`, `fail`, `scenario(name, args)`, `use(...overrides)`)
and a `serverMocks` option that drive the mocks living in an SSR/BFF app's
server over HTTP, with an automatic reset before and after each test. It needs
only `@playwright/test`. The `/msw` peers widen to `msw ^2.12.10 || ^3.0.0` and
`@msw/playwright >=0.6.7 <0.8`, measured against msw 2.15 with 0.6.7 and msw
3.0.3 with 0.7.0.

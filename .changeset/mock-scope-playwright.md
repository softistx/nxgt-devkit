---
'@nxgt/playwright': minor
---

`createMockServerTest(base, { scope: true })` scopes the server mocks to the worker. The `mockServer` control calls (`reset`, `fail`, `scenario`, `override`) and the `page` and `request` traffic (through `extraHTTPHeaders`) carry `x-mock-scope: <workerIndex>`, so specs that use `mockServer` or `serverMocks` can run with `workers > 1` against an app whose control keeps a state per scope (`@nxgt/msw-graphql` 0.4). Off by default: without the option nothing is sent and the fixture is unchanged.

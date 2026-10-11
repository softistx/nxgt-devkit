---
"@nxgt/msw-graphql": minor
---

First release: mock a GraphQL API with msw by executing the real operations
against a schema. `createExecutor` (failing, guard, parse, validate, execute,
HTTP status from `extensions.http.status`), `graphqlEndpoint`,
`GraphQLHttpError` and `bearerToken`, with `/schema` (`buildMockSchema`) and
`/sdl` (`loadSdl`, Vite `?raw` or a file read).

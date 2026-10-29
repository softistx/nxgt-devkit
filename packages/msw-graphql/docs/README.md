# @nxgt/msw-graphql: documentation

| Page | Read it when |
| --- | --- |
| [guide/getting-started.md](guide/getting-started.md) | you want the whole path once: an SPA with a browser worker, then an SSR/BFF app with a Node server, the control and Playwright |
| [guide/executor.md](guide/executor.md) | you want to know what a mocked call answers and in which order: the guard, the context, errors and HTTP statuses, and how to script a subscription stream (SSE) |
| [guide/schema.md](guide/schema.md) | you are building the mock schema, or loading the SDL in both Vite and Node |
| [guide/control.md](guide/control.md) | an e2e test must reset, fail, reseed or override the mocks, over HTTP or from a unit test, or you are mounting the control in a framework |
| [guide/fetch.md](guide/fetch.md) | your SSR/BFF API client takes a `fetch` and you want mocks with no global patch (Node or Bun, msw 2 or 3) |
| [guide/responses.md](guide/responses.md) | you mock a non-GraphQL endpoint (REST, auth) beside the GraphQL one |
| [guide/runtimes.md](guide/runtimes.md) | you choose between msw 2 and 3, graphql 16 and 17, Node and Bun, or use `typescript-msw` |
| [troubleshooting.md](troubleshooting.md) | you have an error message and want its cause and fix |
| [roadmap.md](roadmap.md) | you want to know what is coming, or why something is not planned |

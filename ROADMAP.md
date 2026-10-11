# Roadmap

Testing and CI tooling, published under `@nxgt/*`. A direction, not a
commitment: there are no dates here. Each package keeps its own detailed
roadmap in its `docs/roadmap.md`.

## Packages

| Package | What it is | Roadmap |
| --- | --- | --- |
| [`@nxgt/playwright`](packages/playwright) | Playwright config, page objects, login, msw and mock-server fixtures, hydration and screen helpers, and Storybook stories as Vitest browser tests with preview capture | [roadmap](packages/playwright/docs/roadmap.md) |
| `@nxgt/msw-graphql` | *(not published yet)* Mock a GraphQL API with msw by executing the real operations against your schema, with a control channel for e2e specs | not published yet |

## Planned

- **`@nxgt/jenkins`** — an SDK to create or upsert Jenkins jobs and nodes
  from code, and to trigger CI runs, including GitHub Actions workflows,
  from Bun/TypeScript scripts. Listed only; no work has started.

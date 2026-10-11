# nxgt-devkit

Testing and CI tooling, published to npm under `@nxgt/*`. Each package
replaces boilerplate that application repositories used to copy by hand.

| Package | What it is |
| --- | --- |
| [`@nxgt/playwright`](packages/playwright) | A shared Playwright config, `BasePage` / `FormPage`, storage-state and login fixtures, hydration-aware navigation and fills, waits for a page at rest, full-page screens, PWA cache checks, msw network fixtures, and Storybook stories as Vitest browser tests with WebP preview capture |
| `@nxgt/msw-graphql` | *(not published yet)* Mock a GraphQL API with msw by executing the real operations against your schema, with a control channel for e2e specs |

What is planned next is in [ROADMAP.md](ROADMAP.md).

## Development

```sh
bun install
bunx playwright install chromium-headless-shell
bun run build
bun run test
bun run verify:artifacts
```

Agents: read [AGENTS.md](AGENTS.md).

## License

MIT

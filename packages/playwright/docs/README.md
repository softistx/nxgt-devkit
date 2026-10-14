# @nxgt/playwright — documentation

| Page | Read it when |
| --- | --- |
| [guide/config.md](guide/config.md) | you are writing `playwright.config.ts`: ports, browsers, phone projects, the web server, the auth setup project, CI defaults |
| [guide/pages-and-fixtures.md](guide/pages-and-fixtures.md) | you are writing page objects, signing accounts in once with storage state, or adding a `login` fixture |
| [guide/helpers.md](guide/helpers.md) | a fill is lost after the page loads, a submit button flickers enabled, a check runs mid-animation, a toast must be gone, a phone layout scrolls sideways, or you need screenshot file names |
| [guide/hydration.md](guide/hydration.md) | a click is lost because the page has not hydrated yet, or you want every `goto` to wait for hydration |
| [guide/screens.md](guide/screens.md) | you want full-page screens of each page on desktop and phone, to review the design |
| [guide/pwa.md](guide/pwa.md) | the app has a service worker: running its specs against a production build, offline, a new worker version, or what its caches hold and what a sign-out leaves |
| [guide/a11y.md](guide/a11y.md) | you want axe accessibility checks (WCAG 2.2 A/AA) in your specs, and Focus Not Obscured (2.4.11) checks against sticky form actions |
| [guide/csp.md](guide/csp.md) | a page must run without a Content-Security-Policy refusal, or its policy must carry a fresh nonce on every script |
| [guide/msw.md](guide/msw.md) | the app's API should be mocked in the browser, per file or per test |
| [guide/mock-server.md](guide/mock-server.md) | the mocks live in the app's server (an SSR/BFF app calling its API), and a spec must fail it, reseed it or change its answers, one worker at a time |
| [guide/storybook.md](guide/storybook.md) | you want every story rendered as a test, or WebP previews of your components captured from stories |
| [guide/migrating.md](guide/migrating.md) | you already have a hand-written `playwright/` folder and want to replace it with this package |
| [troubleshooting.md](troubleshooting.md) | you have an error message and want its cause and fix |
| [roadmap.md](roadmap.md) | you want to know what is coming, or why something is not planned |

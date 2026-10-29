# Mail links (Mailpit)

End-to-end tests of a mail flow (address verification, password reset,
sign-in link) run against a local [Mailpit](https://mailpit.axllent.org) SMTP
sink and need the link inside the latest message sent to an address.
`@nxgt/playwright/mailpit` reads it over Mailpit's HTTP API. It uses `fetch`
only: no peer, no dependency, and it does not need Playwright at all.

```ts
import { expect, test } from '@playwright/test';
import { mailpit } from '@nxgt/playwright/mailpit';

const mail = mailpit();

test('confirms the address', async ({ page }) => {
	await mail.clear();
	await signUp(page, 'new@example.test'); // your page object
	const link = await mail.waitForLink({ to: 'new@example.test', match: /\/confirm\?/ });
	await page.goto(link);
	await expect(page.getByText('Address confirmed')).toBeVisible();
});
```

## The API

```ts
mailpit(options?: { url?: string }): Mailpit

type Mailpit = {
	waitForLink(o: { to: string; match: RegExp; timeout?: number; interval?: number }): Promise<string>;
	latest(o: { to: string }): Promise<MailpitMessage | undefined>;
	clear(): Promise<void>;
};

type MailpitMessage = { id: string; subject: string; html: string; text: string; links: string[] };
```

- **`url`** is Mailpit's HTTP address. Default: `E2E_MAILPIT_URL`, else
  `http://localhost:8025`.
- **`waitForLink`** polls `GET /api/v1/search?query=to:"<address>"` (the address
  is quoted), reads the messages newest first with `GET /api/v1/message/<ID>`
  and returns the first link `match` accepts, from the HTML body (`href`
  values, then bare URLs) and then the text body. Entities such as `&amp;` are
  decoded and a relative link is resolved against Mailpit's URL. `timeout`
  defaults to 15000 ms and `interval` to 250 ms. A global `match` (`/x/g`) is
  safe.
- **`latest`** returns the newest message to the address, with every link it
  holds in `links`, or `undefined`. Use it to see what a pattern should match.
- **`clear`** is `DELETE /api/v1/messages`: it empties the inbox, so a test
  starts without the mails of the previous one. Mailpit is shared by every
  worker: when specs run in parallel, give each its own recipient address and
  skip `clear`.

## Errors

A response that is not `ok` throws an error naming the method, the URL and the
status (`Mailpit GET http://localhost:8025/api/v1/search?query=… answered 404`).
A timeout names the address, the pattern and the Mailpit URL. Both are in the
[troubleshooting](../troubleshooting.md#mailpit).

## Setup

Run Mailpit beside the app, for example `docker run -p 8025:8025 -p 1025:1025
axllent/mailpit`, and point the app's SMTP settings at port 1025 in the e2e
environment. The tests use the HTTP port, 8025.

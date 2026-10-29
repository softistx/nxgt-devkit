import { afterEach, describe, expect, test } from 'bun:test';
import { mailpit } from './mailpit';

const realFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = realFetch;
	delete process.env.E2E_MAILPIT_URL;
});

type Stub = { urls: string[]; methods: string[] };

function stub(routes: (url: string, call: number) => Response): Stub {
	const seen: Stub = { urls: [], methods: [] };
	globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);
		seen.urls.push(url);
		seen.methods.push(init?.method ?? 'GET');
		return routes(url, seen.urls.length);
	}) as typeof fetch;
	return seen;
}

const json = (body: unknown) => Response.json(body);

const mail = (id: string, html: string, text = '') => ({
	ID: id,
	Subject: `s-${id}`,
	HTML: html,
	Text: text,
});

describe('mailpit().waitForLink', () => {
	test('searches with a quoted address, reads the newest first and decodes &amp;', async () => {
		const seen = stub((url) => {
			if (url.includes('/search'))
				return json({
					messages: [
						{ ID: 'old', Created: '2026-01-01T00:00:00Z' },
						{ ID: 'new', Created: '2026-01-02T00:00:00Z' },
					],
				});
			if (url.endsWith('/message/new'))
				return json(
					mail(
						'new',
						'<a href="http://app.test/confirm?token=a&amp;b=2">go</a>',
					),
				);
			return json(
				mail('old', '<a href="http://app.test/confirm?token=old">go</a>'),
			);
		});
		const link = await mailpit().waitForLink({
			to: 'a@b.test',
			match: /\/confirm\?/,
		});
		expect(link).toBe('http://app.test/confirm?token=a&b=2');
		expect(seen.urls[0]).toBe(
			`http://localhost:8025/api/v1/search?query=${encodeURIComponent('to:"a@b.test"')}`,
		);
		expect(seen.urls[1]).toBe('http://localhost:8025/api/v1/message/new');
		expect(seen.urls).toHaveLength(2);
	});

	test('falls back to the text body, and resolves a relative link against the Mailpit URL', async () => {
		process.env.E2E_MAILPIT_URL = 'http://mail.test:9000/';
		stub((url) =>
			url.includes('/search')
				? json({ messages: [{ ID: 'm' }] })
				: json(
						mail('m', '<p>no link</p>', 'Open https://app.test/reset?t=1 now'),
					),
		);
		expect(
			await mailpit().waitForLink({ to: 'a@b.test', match: /reset/ }),
		).toBe('https://app.test/reset?t=1');
		stub((url) =>
			url.includes('/search')
				? json({ messages: [{ ID: 'm' }] })
				: json(mail('m', '<a href="/verify?x=1">v</a>')),
		);
		expect(
			await mailpit({ url: 'http://x.test:1' }).waitForLink({
				to: 'a@b.test',
				match: /verify/,
			}),
		).toBe('http://x.test:1/verify?x=1');
	});

	test('keeps polling until a mail arrives', async () => {
		let searches = 0;
		stub((url) => {
			if (url.includes('/search'))
				return json({ messages: ++searches < 3 ? [] : [{ ID: 'm' }] });
			return json(mail('m', '<a href="http://app.test/ok">ok</a>'));
		});
		expect(
			await mailpit().waitForLink({ to: 'a@b.test', match: /ok/, interval: 1 }),
		).toBe('http://app.test/ok');
		expect(searches).toBe(3);
	});

	test('a global RegExp does not skip links', async () => {
		stub((url) =>
			url.includes('/search')
				? json({ messages: [{ ID: 'm' }] })
				: json(
						mail(
							'm',
							'<a href="http://app.test/c?1">a</a><a href="http://app.test/c?2">b</a>',
						),
					),
		);
		const match = /\/c\?/g;
		expect(await mailpit().waitForLink({ to: 'a@b.test', match })).toBe(
			'http://app.test/c?1',
		);
		expect(await mailpit().waitForLink({ to: 'a@b.test', match })).toBe(
			'http://app.test/c?1',
		);
	});

	test('times out naming the address and the pattern', async () => {
		stub(() => json({ messages: [] }));
		const error = await mailpit()
			.waitForLink({
				to: 'a@b.test',
				match: /confirm/,
				timeout: 20,
				interval: 5,
			})
			.catch((e: Error) => e);
		expect((error as Error).message).toContain('a@b.test');
		expect((error as Error).message).toContain('/confirm/');
		expect((error as Error).message).toContain('http://localhost:8025');
	});

	test('a non-ok answer throws with the URL and the status', async () => {
		stub(() => new Response('nope', { status: 503 }));
		const error = await mailpit({ url: 'http://m.test:8025' })
			.waitForLink({ to: 'a@b.test', match: /x/ })
			.catch((e: Error) => e);
		expect((error as Error).message).toContain(
			'http://m.test:8025/api/v1/search',
		);
		expect((error as Error).message).toContain('503');
	});
});

describe('mailpit().latest and clear', () => {
	test('latest returns the newest message with its links, or undefined', async () => {
		stub((url) =>
			url.includes('/search')
				? json({ messages: [{ ID: 'm' }] })
				: json(mail('m', '<a href="http://a.test/1?a=1&amp;b=2">x</a>')),
		);
		const message = await mailpit().latest({ to: 'a@b.test' });
		expect(message?.subject).toBe('s-m');
		expect(message?.links[0]).toBe('http://a.test/1?a=1&b=2');
		stub(() => json({ messages: [] }));
		expect(await mailpit().latest({ to: 'a@b.test' })).toBeUndefined();
	});

	test('clear sends DELETE /api/v1/messages and checks the status', async () => {
		const seen = stub(() => new Response(null, { status: 200 }));
		await mailpit().clear();
		expect(seen.methods).toEqual(['DELETE']);
		expect(seen.urls).toEqual(['http://localhost:8025/api/v1/messages']);
		stub(() => new Response('', { status: 500 }));
		await expect(mailpit().clear()).rejects.toThrow('500');
	});
});

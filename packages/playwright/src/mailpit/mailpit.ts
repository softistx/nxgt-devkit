import { firstLink, linksOf } from './links';

export type MailpitOptions = {
	/** The Mailpit HTTP address. Default `process.env.E2E_MAILPIT_URL`, then `http://localhost:8025`. */
	url?: string;
};

export type WaitForLinkOptions = {
	/** The recipient address; matched with `to:"<address>"`. */
	to: string;
	/** The link to return: the first one in the message this pattern accepts. */
	match: RegExp;
	/** How long to poll, in ms. Default 15000. */
	timeout?: number;
	/** Pause between two polls, in ms. Default 250. */
	interval?: number;
};

export type MailpitMessage = {
	id: string;
	subject: string;
	html: string;
	text: string;
	/** The message's links, in body order (HTML `href`s, then bare URLs), as written. */
	links: string[];
};

export type Mailpit = {
	/** Polls until a message to `to` holds a link `match` accepts (newest message first); returns it absolute. */
	waitForLink(options: WaitForLinkOptions): Promise<string>;
	/** The newest message to `to`, or `undefined` when there is none. */
	latest(options: { to: string }): Promise<MailpitMessage | undefined>;
	/** Deletes every message (`DELETE /api/v1/messages`). */
	clear(): Promise<void>;
};

type SearchResult = { messages?: { ID: string; Created?: string }[] };
type MessageResult = {
	ID: string;
	Subject?: string;
	HTML?: string;
	Text?: string;
};

const sleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

export function mailpit(options: MailpitOptions = {}): Mailpit {
	const base = (
		options.url ??
		process.env.E2E_MAILPIT_URL ??
		'http://localhost:8025'
	).replace(/\/+$/, '');

	async function call(path: string, init?: RequestInit): Promise<Response> {
		const url = `${base}${path}`;
		const res = await fetch(url, init);
		if (!res.ok)
			throw new Error(
				`Mailpit ${init?.method ?? 'GET'} ${url} answered ${res.status}`,
			);
		return res;
	}

	async function idsTo(to: string): Promise<string[]> {
		const query = encodeURIComponent(`to:"${to}"`);
		const found = (await (
			await call(`/api/v1/search?query=${query}`)
		).json()) as SearchResult;
		// The search lists the newest first; sort anyway so a reordering never returns a stale link.
		return [...(found.messages ?? [])]
			.sort(
				(a, b) =>
					(Date.parse(b.Created ?? '') || 0) -
					(Date.parse(a.Created ?? '') || 0),
			)
			.map((m) => m.ID);
	}

	async function read(id: string): Promise<MailpitMessage> {
		const m = (await (
			await call(`/api/v1/message/${encodeURIComponent(id)}`)
		).json()) as MessageResult;
		const html = m.HTML ?? '';
		const text = m.Text ?? '';
		return {
			id: m.ID,
			subject: m.Subject ?? '',
			html,
			text,
			links: linksOf(html, text),
		};
	}

	return {
		async waitForLink({ to, match, timeout = 15_000, interval = 250 }) {
			const deadline = Date.now() + timeout;
			for (;;) {
				for (const id of await idsTo(to)) {
					const message = await read(id);
					const link = firstLink(message.html, message.text, match, base);
					if (link) return link;
				}
				if (Date.now() + interval > deadline) {
					throw new Error(
						`No mail to ${to} with a link matching ${match} reached Mailpit at ${base} within ${timeout} ms`,
					);
				}
				await sleep(interval);
			}
		},
		async latest({ to }) {
			const [id] = await idsTo(to);
			return id === undefined ? undefined : read(id);
		},
		async clear() {
			await call('/api/v1/messages', { method: 'DELETE' });
		},
	};
}

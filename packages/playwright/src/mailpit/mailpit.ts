import { createClient } from './client';
import { firstLink } from './links';

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

const sleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

export function mailpit(options: MailpitOptions = {}): Mailpit {
	const base = (
		options.url ??
		process.env.E2E_MAILPIT_URL ??
		'http://localhost:8025'
	).replace(/\/+$/, '');
	const { call, idsTo, read } = createClient(base);

	return {
		async waitForLink({ to, match, timeout = 15_000, interval = 250 }) {
			const deadline = Date.now() + timeout;
			const left = () => deadline - Date.now();
			for (;;) {
				for (const id of await idsTo(to, left())) {
					const message = await read(id, left());
					const link = firstLink(message.html, message.text, match, base);
					if (link) return link;
				}
				if (left() < interval) {
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

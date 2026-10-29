import { linksOf } from './links';
import type { MailpitMessage } from './mailpit';

type SearchResult = { messages?: { ID: string; Created?: string }[] };
type MessageResult = {
	ID: string;
	Subject?: string;
	HTML?: string;
	Text?: string;
};

/** Per-request ceiling, so a hung Mailpit cannot hold a poll past its deadline. */
const REQUEST_MS = 5000;

export type MailpitClient = {
	call(path: string, init?: RequestInit, remaining?: number): Promise<Response>;
	/** Message ids to an address, newest first. */
	idsTo(to: string, remaining?: number): Promise<string[]>;
	read(id: string, remaining?: number): Promise<MailpitMessage>;
};

export function createClient(base: string): MailpitClient {
	async function call(
		path: string,
		init: RequestInit = {},
		remaining = REQUEST_MS,
	) {
		const url = `${base}${path}`;
		const signal = AbortSignal.timeout(
			Math.max(1, Math.min(remaining, REQUEST_MS)),
		);
		const res = await fetch(url, { ...init, signal });
		if (!res.ok)
			throw new Error(
				`Mailpit ${init.method ?? 'GET'} ${url} answered ${res.status}`,
			);
		return res;
	}

	return {
		call,
		async idsTo(to, remaining) {
			const query = encodeURIComponent(`to:"${to.replace(/["\\]/g, '\\$&')}"`);
			const found = (await (
				await call(`/api/v1/search?query=${query}`, {}, remaining)
			).json()) as SearchResult;
			// The search lists the newest first; sort anyway so a reordering never returns a stale link.
			return [...(found.messages ?? [])]
				.sort(
					(a, b) =>
						(Date.parse(b.Created ?? '') || 0) -
						(Date.parse(a.Created ?? '') || 0),
				)
				.map((m) => m.ID);
		},
		async read(id, remaining) {
			const res = await call(
				`/api/v1/message/${encodeURIComponent(id)}`,
				{},
				remaining,
			);
			const m = (await res.json()) as MessageResult;
			const html = m.HTML ?? '';
			const text = m.Text ?? '';
			return {
				id: m.ID,
				subject: m.Subject ?? '',
				html,
				text,
				links: linksOf(html, text),
			};
		},
	};
}

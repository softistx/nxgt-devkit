import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

export type NextWorkerVersionOptions = {
	/**
	 * The worker's script on disk, as the server serves it (a production
	 * build's `service-worker.js`); relative to the current directory.
	 */
	file: string;
	/**
	 * How the next version differs. Default: a comment appended, which is
	 * enough for the browser to see a new worker (a byte-for-byte check).
	 */
	edit?: (source: string) => string;
	/** For the new worker to install. Default `15_000`. */
	timeout?: number;
};

/** The default edit: one comment more, unique per call. */
export function appendVersionComment(source: string): string {
	return `${source}\n// next version ${Date.now()}\n`;
}

type Found = { ok: true } | { ok: false; reason: 'no-registration' | 'none' };

/** The global the new worker waits in between the two in-page steps. */
const NEXT_WORKER = '__nxgtNextWorker';

/**
 * Asks the page's registration for an update and keeps the new worker it
 * finds under `window[NEXT_WORKER]` (a `ServiceWorker` cannot leave the page).
 */
function findNewWorker(page: Page): Promise<Found> {
	return page.evaluate(async (key) => {
		const registration = await navigator.serviceWorker.getRegistration();
		if (!registration) return { ok: false, reason: 'no-registration' } as const;
		const before = [
			registration.installing,
			registration.waiting,
			registration.active,
		];
		let installing: ServiceWorker | null = null;
		const updateFound = new Promise<void>((resolve) =>
			registration.addEventListener(
				'updatefound',
				() => {
					installing = registration.installing;
					resolve();
				},
				{ once: true },
			),
		);
		await registration.update();
		// `updatefound` is a task of its own: give it a moment.
		await Promise.race([
			updateFound,
			new Promise((resolve) => setTimeout(resolve, 1_000)),
		]);
		const worker =
			installing ??
			[registration.installing, registration.waiting, registration.active].find(
				(candidate) => candidate && !before.includes(candidate),
			) ??
			null;
		if (!worker) return { ok: false, reason: 'none' } as const;
		(window as unknown as Record<string, ServiceWorker>)[key] = worker;
		return { ok: true } as const;
	}, NEXT_WORKER);
}

/**
 * The state the worker `findNewWorker` kept reaches once it has installed,
 * `timeout:<state>` when it is still installing after `timeout`, or
 * `lost` when the page navigated in between. Removes the global.
 */
function installedState(page: Page, timeout: number): Promise<string> {
	return page.evaluate(
		({ key, timeout }) =>
			new Promise<string>((resolve) => {
				const globals = window as unknown as Record<string, ServiceWorker>;
				const worker = globals[key];
				delete globals[key];
				if (!worker) return resolve('lost');
				const installed = () =>
					worker.state !== 'installing' && worker.state !== 'parsed';
				if (installed()) return resolve(worker.state);
				const timer = setTimeout(
					() => resolve(`timeout:${worker.state}`),
					timeout,
				);
				worker.addEventListener('statechange', () => {
					if (!installed()) return;
					clearTimeout(timer);
					resolve(worker.state);
				});
			}),
		{ key: NEXT_WORKER, timeout },
	);
}

/** Why the new version did not install, or `undefined` when it did. */
function explain(
	found: Found,
	state: string | undefined,
	path: string,
	url: string,
	timeout: number,
): string | undefined {
	if (!found.ok) {
		return found.reason === 'no-registration'
			? `no service worker is registered for ${url}. Wait for it first: serviceWorkerControlled(page).`
			: `the browser found no new worker after editing ${path}. ` +
					'Is it the file the server sends for the registered script, read anew per request ' +
					'(not kept in memory, nor cached by a CDN)?';
	}
	if (state === 'lost') {
		return 'the page navigated away while the new worker installed: let the call finish first.';
	}
	if (state?.startsWith('timeout:')) {
		return `the new worker did not install within ${timeout}ms: still ${state.slice('timeout:'.length)}.`;
	}
	if (state === 'redundant') {
		return (
			'the new worker failed to install (redundant): its install handler threw or a ' +
			"precache request failed. Read the worker's console (Playwright's page.context().serviceWorkers())."
		);
	}
	return undefined;
}

/**
 * Makes the page's service worker see a new version of itself, as a deploy
 * would: the script on disk is edited, the registration checks for an update
 * (`registration.update()`), and the script is restored at once. Resolves
 * once the new worker has installed — waiting, or active when it skips
 * waiting. Playwright cannot route a worker's update check, so the server
 * must read the script anew per request.
 *
 * The file is shared: no two specs may edit it at once (one worker for the
 * run, or the update specs in one serial file).
 */
export async function nextWorkerVersion(
	page: Page,
	{
		file,
		edit = appendVersionComment,
		timeout = 15_000,
	}: NextWorkerVersionOptions,
): Promise<void> {
	const path = resolve(file);
	const original = await readFile(path, 'utf-8');
	const next = edit(original);
	if (next === original) {
		throw new Error(
			`nextWorkerVersion: the edit left ${path} as it was; the browser would see no new worker.`,
		);
	}
	await writeFile(path, next);
	let found: Found;
	try {
		found = await findNewWorker(page);
	} finally {
		await writeFile(path, original);
	}
	const state = found.ok ? await installedState(page, timeout) : undefined;
	const reason = explain(found, state, path, page.url(), timeout);
	if (reason) throw new Error(`nextWorkerVersion: ${reason}`);
}

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import {
	cachedUrls,
	expectNotCached,
	expectOnlyCaches,
	fillCaches,
	filledCacheUrl,
	goOffline,
	goOnline,
	nextWorkerVersion,
	serviceWorkerControlled,
} from '../../src/pwa';

test('a worker takes control and its caches are listed', async ({ page }) => {
	await page.goto('/sw-page');
	await serviceWorkerControlled(page);
	await expect
		.poll(() => cachedUrls(page))
		.toEqual({ 'probe-v1': ['/sw-page', '/data.json?v=1'] });
});

test('expectNotCached passes for a URL no cache holds, and names the cache that does', async ({
	page,
}) => {
	await page.goto('/');
	await page.evaluate(async () => {
		const cache = await caches.open('pages');
		await cache.put('/account', new Response('signed in'));
	});
	await expectNotCached(page, '/sign-out');
	await expectNotCached(page, /^\/api\//);
	const error = await expectNotCached(page, /^\/acc/).catch((e: Error) => e);
	expect(error).toBeInstanceOf(Error);
	expect((error as Error).message).toContain(
		'/^\\/acc/ is cached: pages (/account)',
	);
});

test('serviceWorkerControlled says why when no worker controls the page', async ({
	page,
}) => {
	await page.goto('/');
	const error = await serviceWorkerControlled(page, { timeout: 300 }).catch(
		(e: Error) => e,
	);
	expect(error).toBeInstanceOf(Error);
	expect((error as Error).message).toContain(
		`No service worker controls ${page.url()} after 300ms`,
	);
});

test('cachedUrls says when the page has no Cache Storage', async ({ page }) => {
	const error = await cachedUrls(page).catch((e: Error) => e);
	expect(error).toBeInstanceOf(Error);
	expect((error as Error).message).toContain(
		'cachedUrls: about:blank has no Cache Storage',
	);
});

test('fillCaches puts one entry per cache; expectOnlyCaches checks what is left', async ({
	page,
}) => {
	await page.goto('/');
	await fillCaches(page, ['app-precache-v1', 'app-pages-v1']);
	expect(await cachedUrls(page)).toEqual({
		'app-precache-v1': [filledCacheUrl('app-precache-v1')],
		'app-pages-v1': [filledCacheUrl('app-pages-v1')],
	});
	await expectOnlyCaches(page, /^app-/);

	// What a sign-out would do: every cache but the precache deleted.
	await page.evaluate(() => caches.delete('app-pages-v1'));
	await expectOnlyCaches(page, 'app-precache-v1');
	await expectOnlyCaches(page, [
		(name) => name.endsWith('-v1'),
		'app-precache-v1',
	]);

	const error = await expectOnlyCaches(page, 'fonts').catch((e: Error) => e);
	expect(error).toBeInstanceOf(Error);
	expect((error as Error).message).toContain(
		'Unexpected Cache Storage (caches left: app-precache-v1; caches missing: fonts); present: app-precache-v1',
	);
});

test('offline, the worker answers from its cache; online again, the network does', async ({
	page,
}) => {
	await page.goto('/sw-page');
	await goOffline(page);
	await page.reload();
	await expect(page).toHaveTitle('Probe');
	const fetched = (url: string) =>
		page.evaluate(
			(url) =>
				fetch(url).then(
					(response) => response.status,
					() => 'failed',
				),
			url,
		);
	expect(await fetched('/data.json?v=1')).toBe(200); // precached
	expect(await fetched('/data.json?v=2')).toBe('failed');
	await goOnline(page);
	expect(await fetched('/data.json?v=2')).toBe(200);
});

test('goOffline waits for a worker, unless told there is none', async ({
	page,
}) => {
	await page.goto('/');
	const error = await goOffline(page, { timeout: 300 }).catch((e: Error) => e);
	expect((error as Error).message).toContain('No service worker controls');
	expect(await page.evaluate(() => navigator.onLine)).toBe(true);
	await goOffline(page, { worker: false });
	expect(await page.evaluate(() => navigator.onLine)).toBe(false);
	await goOnline(page);
});

test.describe('nextWorkerVersion', () => {
	// The server reads `/versioned-sw.js?id=<id>` from this folder (server.ts).
	const dir = join(tmpdir(), 'nxgt-playwright-probe');
	// No skipWaiting: a new version waits while the first controls the page.
	const WORKER =
		"self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));\n";
	let file = '';
	let id = '';

	test.beforeEach(async ({ page }, testInfo) => {
		id = `${testInfo.testId}-${testInfo.retry}`.replace(/[^\w-]/g, '');
		file = join(dir, `${id}.js`);
		await mkdir(dir, { recursive: true });
		await writeFile(file, WORKER);
		await page.goto(`/versioned-page?id=${id}`);
		await serviceWorkerControlled(page);
	});

	test.afterEach(async () => {
		await rm(file, { force: true });
	});

	test('a new version installs and waits; the file is restored', async ({
		page,
	}) => {
		await nextWorkerVersion(page, { file });
		expect(
			await page.evaluate(async () => {
				const registration = await navigator.serviceWorker.getRegistration();
				return registration?.waiting?.state;
			}),
		).toBe('installed');
		expect(await readFile(file, 'utf-8')).toBe(WORKER);
	});

	test('a file the server does not send for the worker is said so', async ({
		page,
	}) => {
		const other = join(dir, `${id}-other.js`);
		await writeFile(other, WORKER);
		try {
			const error = await nextWorkerVersion(page, { file: other }).catch(
				(e: Error) => e,
			);
			expect((error as Error).message).toContain(
				`nextWorkerVersion: the browser found no new worker after editing ${other}`,
			);
		} finally {
			await rm(other, { force: true });
		}
	});

	test('a version that fails to install is said so', async ({ page }) => {
		const error = await nextWorkerVersion(page, {
			file,
			edit: (source) =>
				`${source}self.addEventListener('install', (event) => event.waitUntil(Promise.reject(new Error('broken'))));\n`,
		}).catch((e: Error) => e);
		expect((error as Error).message).toContain(
			'nextWorkerVersion: the new worker failed to install (redundant)',
		);
		expect(await readFile(file, 'utf-8')).toBe(WORKER);
	});

	test('a page with no worker is said so', async ({ browser }) => {
		const page = await browser.newPage({
			baseURL: test.info().project.use.baseURL,
		});
		try {
			await page.goto('/');
			const error = await nextWorkerVersion(page, { file }).catch(
				(e: Error) => e,
			);
			expect((error as Error).message).toContain(
				'nextWorkerVersion: no service worker is registered for',
			);
			expect(await readFile(file, 'utf-8')).toBe(WORKER);
		} finally {
			await page.close();
		}
	});
});

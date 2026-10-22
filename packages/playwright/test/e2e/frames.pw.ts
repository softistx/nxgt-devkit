import { expect, test } from '@playwright/test';
import {
	isMobileProject,
	nextFrames,
	settled,
	toastsGone,
} from '../../src/helpers';

test('settled waits for a transition to end', async ({ page }) => {
	await page.setContent(
		`<div id="box" style="opacity:0;transition:opacity 600ms linear">Box</div>`,
	);
	await page.evaluate(() => {
		const box = document.getElementById('box') as HTMLElement;
		void box.offsetWidth;
		box.style.opacity = '1';
	});
	await expect
		.poll(() => page.evaluate(() => document.getAnimations().length))
		.toBe(1);
	await settled(page);
	expect(
		await page.evaluate(
			() => getComputedStyle(document.getElementById('box') as Element).opacity,
		),
	).toBe('1');
});

test('settled waits for a view transition whose animations have not started yet', async ({
	page,
}) => {
	// The update callback takes 200ms (a framework rendering the new state):
	// until it resolves, the transition is active but has no animation yet.
	await page.setContent(
		`<style>::view-transition-old(root),::view-transition-new(root){animation-duration:400ms}</style><p id="state">Old</p>`,
	);
	test.skip(
		!(await page.evaluate(() => 'startViewTransition' in document)),
		'no view transitions in this browser',
	);
	await page.evaluate(() => {
		document.startViewTransition(async () => {
			await new Promise((r) => setTimeout(r, 200));
			(document.getElementById('state') as HTMLElement).textContent = 'New';
		});
	});
	await settled(page);
	expect(
		await page.evaluate(() => ({
			state: document.getElementById('state')?.textContent,
			active:
				(document as Document & { activeViewTransition?: unknown })
					.activeViewTransition ?? null,
			animations: document.getAnimations().length,
		})),
	).toEqual({ state: 'New', active: null, animations: 0 });
});

test('settled leaves an infinite animation running', async ({ page }) => {
	await page.setContent(`<style>@keyframes spin{to{transform:rotate(1turn)}}</style>
<div style="animation:spin 1s linear infinite">Spinner</div>`);
	await settled(page);
	expect(await page.evaluate(() => document.getAnimations().length)).toBe(1);
});

test('nextFrames waits for that many frames', async ({ page }) => {
	await page.setContent('<p>Frames</p>');
	await page.evaluate(() => {
		const w = window as unknown as { frameCount: number };
		w.frameCount = 0;
		const tick = () => {
			w.frameCount++;
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});
	const before = await page.evaluate(
		() => (window as unknown as { frameCount: number }).frameCount,
	);
	await nextFrames(page, 4);
	const after = await page.evaluate(
		() => (window as unknown as { frameCount: number }).frameCount,
	);
	expect(after - before).toBeGreaterThanOrEqual(4);
});

// A toast that mounts 200ms late and leaves 500ms after, unless a pointer
// rests on it.
const TOAST = `<button id="save" style="position:fixed;bottom:0;left:0;width:300px;height:60px">Save</button>
<script>
	document.getElementById('save').addEventListener('click', () => setTimeout(() => {
		const toast = document.createElement('li');
		toast.setAttribute('data-sonner-toast', '');
		toast.className = 'toast';
		toast.textContent = 'Saved';
		toast.style.cssText = 'position:fixed;bottom:0;left:0;width:300px;height:60px;background:#eee';
		document.body.append(toast);
		let timer = setTimeout(() => toast.remove(), 500);
		toast.addEventListener('mouseenter', () => clearTimeout(timer));
		toast.addEventListener('mouseleave', () => { timer = setTimeout(() => toast.remove(), 500); });
	}, 200));
</script>`;

test('toastsGone waits for the toast to show, then for none, moving the pointer off it', async ({
	page,
}, testInfo) => {
	test.skip(isMobileProject(testInfo), 'a phone has no hover to pause on');
	await page.setContent(TOAST);
	await page.locator('#save').click();
	// The pointer stays on the button, where the toast mounts and pauses.
	await toastsGone(page, 'Saved', { timeout: 3_000 });
	await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
});

test('toastsGone takes the selector of another toast library', async ({
	page,
}) => {
	await page.setContent(
		TOAST.replaceAll(`toast.setAttribute('data-sonner-toast', '');`, ''),
	);
	await page.locator('#save').click();
	await toastsGone(page, /saved/i, { selector: '.toast', timeout: 3_000 });
});

test('isMobileProject tells the phone project', async ({
	browserName,
}, testInfo) => {
	expect(browserName).toBe('chromium');
	expect(isMobileProject(testInfo)).toBe(
		testInfo.project.name === 'mobile-chromium',
	);
});

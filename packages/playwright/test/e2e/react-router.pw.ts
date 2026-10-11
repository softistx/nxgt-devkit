import { test as base, expect } from '@playwright/test';
import { withHydration } from '../../src/helpers';
import { elementHydrated, reactRouterHydrated } from '../../src/react-router';

const test = withHydration(base, { marker: reactRouterHydrated });

test('the React Router marker waits for the router and React', async ({
	page,
}) => {
	await page.goto('/react-router');
	expect(
		await page.evaluate(
			() =>
				'__reactRouterDataRouter' in window &&
				'__reactFiber$probe' in document.body,
		),
	).toBe(true);
});

test('elementHydrated waits for React to attach the props', async ({
	page,
}) => {
	await page.goto('/react-router');
	const late = page.getByTestId('late');
	await expect(late).toBeVisible();
	await elementHydrated(late);
	expect(await late.evaluate((el) => '__reactProps$probe' in el)).toBe(true);
});

test('elementHydrated fails on an element React never hydrates', async ({
	page,
}) => {
	await page.goto('/react-router');
	const error = await elementHydrated(page.locator('body'), {
		timeout: 300,
	}).catch((e: Error) => e);
	expect(error).toBeInstanceOf(Error);
	expect((error as Error).message).toContain(
		'React never attached its props to this element',
	);
});

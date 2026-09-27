import { expect, type Locator } from '@playwright/test';

export type FillSettledOptions = {
	/** How long the value must survive before it counts. Default `300`. */
	settle?: number;
	/** Give up after this long. Default `30_000`. */
	timeout?: number;
};

/**
 * Fills an input in a way that survives hydration.
 *
 * A server-rendered input is there, and fillable, before the framework has
 * hydrated; when it does, a controlled input is reset to its initial value and
 * the first fill is silently lost. A value still there `settle` ms later was
 * typed into a hydrated input.
 */
export async function fillSettled(
	input: Locator,
	value: string,
	{ settle = 300, timeout = 30_000 }: FillSettledOptions = {},
): Promise<void> {
	await expect(async () => {
		await input.fill(value);
		await input.page().waitForTimeout(settle);
		await expect(input).toHaveValue(value, { timeout: 1_000 });
	}).toPass({ timeout });
}

/**
 * Fills every field and waits for `submit` to be enabled, then checks both
 * still hold `settle` ms later — retrying the whole set if hydration reset any
 * of them. For a form whose submit stays disabled until it is valid: the button
 * enables on the first fill, *before* the reset disables it again, so being
 * enabled once proves nothing.
 */
export async function fillUntilEnabled(
	fields: ReadonlyArray<readonly [Locator, string]>,
	submit: Locator,
	{ settle = 300, timeout = 30_000 }: FillSettledOptions = {},
): Promise<void> {
	await expect(async () => {
		for (const [input, value] of fields) await input.fill(value);
		await expect(submit).toBeEnabled({ timeout: 1_000 });
		await submit.page().waitForTimeout(settle);
		for (const [input, value] of fields) {
			await expect(input).toHaveValue(value, { timeout: 1_000 });
		}
		await expect(submit).toBeEnabled({ timeout: 1_000 });
	}).toPass({ timeout });
}

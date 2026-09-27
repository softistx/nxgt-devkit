import type { Locator, Page } from '@playwright/test';
import { BasePage, type BasePageOptions } from './base.page';

export type FormPageOptions = BasePageOptions & {
	/** Test id of the submit button. Default `submit`. */
	submitTestId?: string;
};

/** A `BasePage` with a submit button, found by test id. */
export class FormPage extends BasePage {
	readonly submitButton: Locator;

	constructor(page: Page, path: string, options: FormPageOptions = {}) {
		super(page, path, options);
		this.submitButton = page.getByTestId(options.submitTestId ?? 'submit');
	}

	submit() {
		return this.submitButton.click();
	}
}

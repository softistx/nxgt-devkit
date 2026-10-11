import { expect, test } from '@playwright/test';
import { selectedProjects } from '../../src/config';

test('a worker sees the projects the command line selected', ({
	browserName,
}, testInfo) => {
	expect(browserName).toBeTruthy();
	// `--project=chromium` on the command line: both are `['chromium']`.
	expect(selectedProjects()).toEqual(
		testInfo.config.metadata.selectedInRunner as string[],
	);
});

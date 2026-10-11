import type { TestInfo } from '@playwright/test';

/**
 * Whether the test runs in a project that emulates a phone or a tablet
 * (`isMobile`, as the projects `defineAppConfig`'s `mobile` adds do).
 */
export function isMobileProject(testInfo: TestInfo): boolean {
	return Boolean(testInfo.project.use.isMobile);
}

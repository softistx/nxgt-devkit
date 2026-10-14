import type { BrowserContext } from '@playwright/test';

type Violation = {
	directive: string;
	blocked: string;
	source: string;
	page: string;
	sample: string;
};

declare global {
	interface Window {
		__nxgtCspViolation?: (violation: Violation) => void;
	}
}

// Errors only: Firefox logs an info-level warning about 'self' beside
// 'strict-dynamic' that is not a refusal.
const CSP_ERROR = /Content[- ]Security[- ]Policy|Refused to /i;

/** The line a refusal is reported as. */
export function formatViolation(violation: Violation): string {
	return `${violation.directive} refused ${violation.blocked || 'inline'} in ${violation.page} (${violation.source} ${violation.sample})`;
}

/** Whether a console error is a Content-Security-Policy refusal. */
export function isCspError(text: string): boolean {
	return CSP_ERROR.test(text);
}

/**
 * Collects every Content-Security-Policy refusal in the pages of a context
 * from now on: each `securitypolicyviolation` event, and each console error
 * that reports one. The returned array fills as the pages run; call it before
 * the first `goto`.
 */
export async function watchCsp(context: BrowserContext): Promise<string[]> {
	const violations: string[] = [];
	await context.exposeFunction('__nxgtCspViolation', (violation: Violation) => {
		violations.push(formatViolation(violation));
	});
	await context.addInitScript(() => {
		document.addEventListener('securitypolicyviolation', (event) => {
			window.__nxgtCspViolation?.({
				directive: event.effectiveDirective,
				blocked: event.blockedURI || 'inline',
				source: event.sourceFile
					? `${event.sourceFile}:${event.lineNumber}`
					: '',
				page: event.documentURI,
				sample: event.sample,
			});
		});
	});
	context.on('console', (message) => {
		if (message.type() !== 'error' || !isCspError(message.text())) return;
		violations.push(`console: ${message.text()} (${message.location().url})`);
	});
	return violations;
}

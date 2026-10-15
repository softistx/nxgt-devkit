/**
 * What `expectTapTargets` counts as a tap target by default: links,
 * form controls, `summary`, the interactive ARIA roles, whatever a script
 * made focusable with a `tabindex` and whatever has an `onclick` attribute.
 */
export const DEFAULT_TAP_TARGETS: readonly string[] = [
	'a[href]',
	'button',
	'input:not([type=hidden])',
	'select',
	'textarea',
	'summary',
	'[role=button]',
	'[role=link]',
	'[role=checkbox]',
	'[role=radio]',
	'[role=switch]',
	'[role=tab]',
	'[role=menuitem]',
	'[role=option]',
	'[tabindex]:not([tabindex="-1"])',
	'[onclick]',
];

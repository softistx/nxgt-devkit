// Not re-exported from the root: it needs the optional peer
// `@axe-core/playwright`, which an app without accessibility checks does not
// install.
export { type A11yFixtures, withA11y } from './fixture';
export {
	type FormatViolationsOptions,
	formatViolations,
	type ViolationSummary,
} from './format';
export {
	expectFieldsAboveActions,
	expectFocusAboveActions,
	type FocusFieldsOptions,
	type FocusOptions,
} from './obscured';
export {
	type A11yOptions,
	DEFAULT_TAGS,
	DEFAULT_UNSTICK,
	type DisabledRule,
} from './options';
export {
	type AccessibilityResults,
	accessibilityScan,
	type ExpectAccessibleOptions,
	expectAccessible,
} from './scan';
export { withOverlaysInFlow } from './unstick';

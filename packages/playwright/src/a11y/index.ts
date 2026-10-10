// Not re-exported from the root: it needs the optional peer
// `@axe-core/playwright`, which an app without accessibility checks does not
// install.
export { type A11yFixtures, withA11y } from './fixture';
export {
	type FormatViolationsOptions,
	formatViolations,
	type ViolationSummary,
} from './format';
export { type A11yOptions, DEFAULT_TAGS, type DisabledRule } from './options';
export {
	type AccessibilityResults,
	accessibilityScan,
	type ExpectAccessibleOptions,
	expectAccessible,
} from './scan';

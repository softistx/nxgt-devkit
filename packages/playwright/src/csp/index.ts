// Not re-exported from the root: the root barrel stays free of fixtures an app
// opts into. Needs only `@playwright/test`.
export { type CspGuardFixtures, cspTest, withCspGuard } from './fixture';
export {
	type ExpectNoncedPageOptions,
	expectNoncedPage,
	type LoadedPolicy,
	loadPolicy,
} from './nonce';
export { cspNonce } from './policy';
export { watchCsp } from './watch';

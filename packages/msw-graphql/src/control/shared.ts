export class UnknownScenarioError extends Error {
	constructor(name: string, known: string[]) {
		super(`No scenario "${name}". Registered: ${known.join(', ') || 'none'}.`);
		this.name = 'UnknownScenarioError';
	}
}

/**
 * The pure rule behind {@link isProduction}: `nodeEnv` is `process.env.NODE_ENV`
 * and `vitePROD` is `import.meta.env.PROD`, each `undefined` where its runtime
 * does not provide it. Split out so a spec can drive both branches: a bundler
 * replaces `import.meta.env` in a Vite build, so a spec cannot set it.
 */
export const isProductionIn = (
	nodeEnv: string | undefined,
	vitePROD: boolean | undefined,
) => nodeEnv === 'production' || vitePROD === true;

/**
 * True under `NODE_ENV=production` (Node) or in a Vite production build
 * (`import.meta.env.PROD`); safe where there is no `process` or no
 * `import.meta.env`. It fails open when `NODE_ENV` is unset.
 */
export const isProduction = () =>
	isProductionIn(
		typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined,
		(import.meta as { env?: { PROD?: boolean } }).env?.PROD,
	);

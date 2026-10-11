export class UnknownScenarioError extends Error {
	constructor(name: string, known: string[]) {
		super(`No scenario "${name}". Registered: ${known.join(', ') || 'none'}.`);
		this.name = 'UnknownScenarioError';
	}
}

/**
 * True under `NODE_ENV=production` (Node) or in a Vite production build
 * (`import.meta.env.PROD`); safe where there is no `process` or no
 * `import.meta.env`. It fails open when `NODE_ENV` is unset.
 */
export const isProduction = () =>
	(typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') ||
	(import.meta as { env?: { PROD?: boolean } }).env?.PROD === true;

export class UnknownScenarioError extends Error {
	constructor(name: string, known: string[]) {
		super(`No scenario "${name}". Registered: ${known.join(', ') || 'none'}.`);
		this.name = 'UnknownScenarioError';
	}
}

/** True under `NODE_ENV=production`; safe where there is no `process`. */
export const isProduction = () =>
	typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

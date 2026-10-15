import type { Options } from '../options';

/** What a leg may touch: the scratch copy, its package, and the runner. */
export type Context = {
	/** The scratch copy of the workspace. */
	work: string;
	/** `packages/playwright` inside the scratch copy. */
	pkg: string;
	/** The scratch copy's `packages/playwright/package.json`, rewritten after `rewrite`. */
	manifest: { devDependencies: Record<string, string> };
	/** Runs a command in `cwd`; a failure throws (and sets the exit code). */
	run: (step: string, cwd: string, ...command: string[]) => Promise<void>;
	/** The version installed in the scratch package's `node_modules`. */
	installed: (name: string) => Promise<string>;
};

/**
 * A leg is what differs between the runs: the manifest edits, the steps after
 * typecheck, and the final `ok:` line.
 */
export type Leg = {
	label: string;
	rewrite: () => Promise<void>;
	steps: () => Promise<void>;
	ok: () => Promise<string>;
};

export type LegOptions<K extends Options['leg']> = Extract<Options, { leg: K }>;

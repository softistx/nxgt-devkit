/** A selector option as a list: `undefined` is none, a string is one. */
export const toList = (v: string | readonly string[] | undefined): string[] =>
	v === undefined ? [] : typeof v === 'string' ? [v] : [...v];

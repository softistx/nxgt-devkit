import { parse } from 'graphql';
import { HttpResponse, http } from 'msw';
import { scopeOfCall } from '../scope';
import { failingFor, type MockState } from '../state';

/** A static answer for one GraphQL operation, serialisable over HTTP. */
export type Override = {
	operationName: string;
	/** The HTTP status; defaults to the first error's `extensions.http.status`, else 200. */
	status?: number;
	data?: unknown;
	errors?: unknown[];
	/** Answer once, then fall back to the executor. */
	once?: boolean;
};

export const isHttpStatus = (value: unknown): value is number =>
	Number.isInteger(value) &&
	(value as number) >= 100 &&
	(value as number) <= 599;

/** Why `value` is not an override, or null. */
export function overrideProblem(value: unknown): string | null {
	const o = value as Partial<Record<keyof Override, unknown>> | null;
	if (typeof o?.operationName !== 'string' || !o.operationName)
		return 'Each override needs an `operationName` string.';
	if (o.status !== undefined && !isHttpStatus(o.status))
		return '`status` must be an HTTP status (100-599).';
	if (o.errors !== undefined && !Array.isArray(o.errors))
		return '`errors` must be an array.';
	if (o.once !== undefined && typeof o.once !== 'boolean')
		return '`once` must be a boolean.';
	return null;
}

/** An error entry that carries `extensions.http.status`, as an HTTP status. */
type StatusError = { extensions: { http: { status: number } } };

const isStatusError = (error: unknown): error is StatusError => {
	const http = (
		error as { extensions?: { http?: { status?: unknown } } } | null
	)?.extensions?.http;
	return typeof http?.status === 'number';
};

/** The first error's `extensions.http.status`; entries are unknown JSON. */
export const statusOfErrors = (errors: unknown[] | undefined) =>
	errors?.find(isStatusError)?.extensions.http.status;

/**
 * The operation a request carries: its `operationName`, else the name of the
 * document's only operation (a document of several, with none selected, is
 * ambiguous and matches nothing).
 */
function operationOf(body: unknown): string | null {
	const fields = (typeof body === 'object' && body !== null ? body : {}) as {
		operationName?: unknown;
		query?: unknown;
	};
	if (typeof fields.operationName === 'string') return fields.operationName;
	try {
		const operations = parse(String(fields.query)).definitions.filter(
			(definition) => definition.kind === 'OperationDefinition',
		);
		const only = operations.length === 1 ? operations[0] : undefined;
		return only && 'name' in only ? (only.name?.value ?? null) : null;
	} catch {
		return null;
	}
}

/**
 * The msw handler of one override. It is a catch-all `http.post` that decides
 * from the body whether the operation is its own (msw 3 moved `graphql` to
 * `msw/graphql`, which msw 2 does not have), so msw's `once` would be spent by
 * the first POST of any kind: `once` is kept here, after a match. While the
 * API is made to fail it stands aside, so `failing` stays first in the order.
 */
export function overrideHandler(override: Override, state: MockState) {
	let used = false;
	return http.post('*', async ({ request }) => {
		if (used || failingFor(state, scopeOfCall(request)) !== null)
			return undefined;
		const body = await request
			.clone()
			.json()
			.catch(() => null);
		if (operationOf(body) !== override.operationName) return undefined;
		// Re-check after the awaits: a concurrent request may have spent it.
		if (override.once) {
			if (used) return undefined;
			used = true;
		}
		return answer(override);
	});
}

function answer(override: Override) {
	const status = override.status ?? statusOfErrors(override.errors) ?? 200;
	return HttpResponse.json(
		{
			...(override.data !== undefined && { data: override.data }),
			...(override.errors && { errors: override.errors }),
		},
		{ status },
	);
}

/**
 * The one msw handler of a mock scope: it answers only the calls of `scope`,
 * from the overrides `state` holds for it, the latest first. It is registered
 * once per scope, and a scoped reset empties the list, so handlers do not pile
 * up over a long run.
 */
export function scopedOverrideHandler(scope: string, state: MockState) {
	return http.post('*', async ({ request }) => {
		if (scopeOfCall(request) !== scope) return undefined;
		if (!state.scopes.get(scope)?.overrides.length) return undefined;
		if (failingFor(state, scope) !== null) return undefined;
		const name = operationOf(
			await request
				.clone()
				.json()
				.catch(() => null),
		);
		// Read after the await: a reset may have emptied the list meanwhile.
		const entries = state.scopes.get(scope)?.overrides ?? [];
		for (let i = entries.length - 1; i >= 0; i--) {
			const entry = entries[i];
			if (!entry || entry.used || entry.override.operationName !== name)
				continue;
			if (entry.override.once) entry.used = true;
			return answer(entry.override);
		}
		return undefined;
	});
}

import { HttpResponse, http } from 'msw';
import type { Executor } from './executor';

type Body = {
	query?: unknown;
	variables?: Record<string, unknown> | null;
	operationName?: string | null;
};

/**
 * One msw handler for every GraphQL POST to `url`, answered by `execute`: no
 * generated per-operation handlers needed.
 *
 * ```ts
 * export const handlers = [graphqlEndpoint(env.API_URL, execute)];
 * ```
 *
 * It is `http.post`, not msw's `graphql` handler, so the executor's own
 * parse and validate answer a malformed operation with a 400, as the API does.
 */
export function graphqlEndpoint(url: string | RegExp, execute: Executor) {
	return http.post(url, async ({ request }) => {
		let body: Body;
		try {
			body = (await request.clone().json()) as Body;
		} catch {
			return HttpResponse.json(
				{ errors: [{ message: 'The body is not JSON.' }] },
				{ status: 400 },
			);
		}
		if (typeof body?.query !== 'string') {
			return HttpResponse.json(
				{ errors: [{ message: 'The body has no `query` string.' }] },
				{ status: 400 },
			);
		}
		return execute({
			query: body.query,
			variables: body.variables,
			operationName: body.operationName,
			request,
		});
	});
}

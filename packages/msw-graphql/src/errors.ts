import { GraphQLError } from 'graphql';

/**
 * An error shaped the way a GraphQL API sends one: a stable `extensions.code`
 * and the HTTP status to answer with under `extensions.http.status`, which the
 * executor reads to set the response status.
 *
 * ```ts
 * throw new GraphQLHttpError('students.errors.not-found', 404);
 * ```
 */
export class GraphQLHttpError extends GraphQLError {
	readonly status: number;

	constructor(
		code: string,
		status: number,
		extensions: Record<string, unknown> = {},
	) {
		super(code, { extensions: { code, http: { status }, ...extensions } });
		this.name = 'GraphQLHttpError';
		this.status = status;
	}
}

import { HttpResponse } from 'msw';

type Json = Parameters<typeof HttpResponse.json>[0];

const problem = (status: number, message: string) =>
	HttpResponse.json({ timestamp: new Date(), status, message }, { status });

/** 200 with a JSON body. */
export const ok = (body: Json) => HttpResponse.json(body, { status: 200 });

/** 201 with a JSON body. */
export const created = (body: Json) => HttpResponse.json(body, { status: 201 });

/** 204, no body. */
export const noContent = () => new HttpResponse(null, { status: 204 });

/** 400 with `{ timestamp, status, message }`, the shape of a REST error. */
export const badRequest = (message: string) => problem(400, message);

export const unauthorized = (message: string) => problem(401, message);

export const forbidden = (message: string) => problem(403, message);

export const notFound = (message: string) => problem(404, message);

/**
 * A GraphQL answer made of errors: `{ errors }` with `status` (200 by
 * default, as a GraphQL server answers an execution error).
 */
export const graphqlErrors = (
	errors: ReadonlyArray<{
		message: string;
		extensions?: Record<string, unknown>;
	}>,
	status = 200,
) => HttpResponse.json({ errors }, { status });

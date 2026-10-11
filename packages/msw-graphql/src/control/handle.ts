import type { MockControl } from './index';
import { isHttpStatus, overrideProblem } from './override';
import { isProduction, UnknownScenarioError } from './shared';

const ROUTES = ['reset', 'fail', 'scenario', 'override'];

const error = (message: string, status: number, headers?: HeadersInit) =>
	Response.json({ error: message }, { status, headers });

/**
 * `POST <path>/reset|fail|scenario|override` with a JSON body, as a Fetch API
 * handler: null for a path that is not the control's, 404 for an unknown
 * route (and for every route under `NODE_ENV=production`), 405 for a method
 * other than POST, 415 for a body that is not `application/json` (a
 * cross-site page cannot send that without a preflight the app never
 * grants), 400 for bad input.
 */
export async function handleControl(
	control: MockControl,
	path: string,
	request: Request,
): Promise<Response | null> {
	const url = new URL(request.url);
	if (url.pathname !== path && !url.pathname.startsWith(`${path}/`))
		return null;
	if (isProduction()) return new Response(null, { status: 404 });
	const route = url.pathname.slice(path.length + 1);
	if (!ROUTES.includes(route)) return new Response(null, { status: 404 });
	if (request.method !== 'POST')
		return error('POST only.', 405, { allow: 'POST' });

	let body: any = {};
	const text = await request.text();
	if (text) {
		if (!request.headers.get('content-type')?.includes('application/json'))
			return error('The body must be application/json.', 415);
		try {
			body = JSON.parse(text);
		} catch {
			return error('The body is not JSON.', 400);
		}
	}

	try {
		switch (route) {
			case 'fail':
				if (body?.status !== null && !isHttpStatus(body?.status))
					return error(
						'`status` must be an HTTP status (100-599) or null.',
						400,
					);
				control.fail(body.status);
				break;
			case 'scenario':
				if (typeof body?.name !== 'string')
					return error('`name` must be a string.', 400);
				await control.scenario(body.name, body.args);
				break;
			case 'override': {
				const list = Array.isArray(body) ? body : [body];
				const problem = list.map(overrideProblem).find(Boolean);
				if (problem) return error(problem, 400);
				control.override(...list);
				break;
			}
			default:
				await control.reset();
		}
	} catch (cause) {
		if (cause instanceof UnknownScenarioError) return error(cause.message, 404);
		return error(cause instanceof Error ? cause.message : String(cause), 500);
	}
	return Response.json({ ok: true });
}

import { SCOPE_HEADER, scopeOf } from '../scope';
import type { MockControl } from './index';
import { isHttpStatus, type Override, overrideProblem } from './override';
import { isProduction, UnknownScenarioError } from './shared';

const ROUTES = ['reset', 'fail', 'scenario', 'override'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const error = (message: string, status: number, headers?: HeadersInit) =>
	Response.json({ error: message }, { status, headers });

/**
 * `POST <path>/reset|fail|scenario|override` with a JSON body, as a Fetch API
 * handler: null for a path that is not the control's, 404 for an unknown
 * route (and for every route under `NODE_ENV=production`), 405 for a method
 * other than POST, 415 for a request without `Content-Type: application/json`, an empty body included (a
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

	// Every POST carries `application/json`, an empty body included: a form or
	// text/plain POST is what a cross-site page can send without a preflight.
	if (!request.headers.get('content-type')?.includes('application/json'))
		return error('The body must be application/json.', 415);
	let body: unknown = {};
	const text = await request.text();
	if (text) {
		try {
			body = JSON.parse(text);
		} catch {
			return error('The body is not JSON.', 400);
		}
	}
	// An invalid scope is refused: treating it as none would reset every scope.
	const scoped = request.headers.has(SCOPE_HEADER);
	const scope = scopeOf(request);
	if (scoped && scope === undefined)
		return error(
			`\`${SCOPE_HEADER}\` must be 1-64 characters of letters, digits and _ . : -.`,
			400,
		);
	const target = scope === undefined ? control : control.scope(scope);
	const fields = (isRecord(body) ? body : {}) as Record<string, unknown>;

	try {
		switch (route) {
			case 'fail':
				if (fields.status !== null && !isHttpStatus(fields.status))
					return error(
						'`status` must be an HTTP status (100-599) or null.',
						400,
					);
				target.fail(fields.status);
				break;
			case 'scenario':
				if (typeof fields.name !== 'string')
					return error('`name` must be a string.', 400);
				await target.scenario(fields.name, fields.args);
				break;
			case 'override': {
				const list: unknown[] = Array.isArray(body) ? body : [body];
				const problem = list.map(overrideProblem).find(Boolean);
				if (problem) return error(problem, 400);
				// overrideProblem has checked each entry against `Override`.
				target.override(...(list as Override[]));
				break;
			}
			default:
				await target.reset();
		}
	} catch (cause) {
		if (cause instanceof UnknownScenarioError) return error(cause.message, 404);
		return error(cause instanceof Error ? cause.message : String(cause), 500);
	}
	return Response.json({ ok: true });
}

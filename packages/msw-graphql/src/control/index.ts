import { parse } from 'graphql';
import { HttpResponse, http } from 'msw';
import { type MockState, mockState } from '../state';

/** The part of an msw server (node or worker) the control needs. */
export type ControlServer = {
	use: (...handlers: any[]) => void;
	resetHandlers: () => void;
};

export type Scenarios = Record<string, (args?: any) => unknown>;

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

export type MockControlOptions = {
	server: ControlServer;
	/** The app's reseed. Called by `reset()`, nothing else is. */
	reset?: () => unknown;
	/** Named app states, run by name with optional JSON arguments. */
	scenarios?: Scenarios;
	/** Where `/reset` etc. are mounted. Defaults to `/__mocks`. */
	path?: string;
	state?: MockState;
};

export class UnknownScenarioError extends Error {
	constructor(name: string, known: string[]) {
		super(`No scenario "${name}". Registered: ${known.join(', ') || 'none'}.`);
		this.name = 'UnknownScenarioError';
	}
}

const isProduction = () => process.env.NODE_ENV === 'production';

function operationNames(body: any): string[] {
	if (typeof body?.operationName === 'string') return [body.operationName];
	try {
		return parse(String(body?.query)).definitions.flatMap((d: any) =>
			d.kind === 'OperationDefinition' && d.name ? [d.name.value] : [],
		);
	} catch {
		return [];
	}
}

export function createMockControl(options: MockControlOptions) {
	if (isProduction()) {
		throw new Error(
			'createMockControl is dev and test only: NODE_ENV is "production". Import the mocks behind your mocks flag.',
		);
	}
	const {
		server,
		scenarios = {},
		path = '/__mocks',
		state = mockState,
	} = options;

	const control = {
		get failing() {
			return state.failing;
		},
		async reset() {
			await options.reset?.();
			server.resetHandlers();
			state.failing = null;
		},
		fail(status: number | null) {
			state.failing = status;
		},
		async scenario(name: string, args?: unknown) {
			const run = Object.hasOwn(scenarios, name) ? scenarios[name] : undefined;
			if (!run) throw new UnknownScenarioError(name, Object.keys(scenarios));
			await run(args);
		},
		override(...overrides: Override[]) {
			for (const o of overrides) {
				server.use(
					http.post(
						'*',
						async ({ request }) => {
							if (state.failing !== null) return undefined;
							const body = await request
								.clone()
								.json()
								.catch(() => null);
							if (!operationNames(body).includes(o.operationName))
								return undefined;
							const status =
								o.status ??
								(o.errors as any[] | undefined)?.find(
									(e) => typeof e?.extensions?.http?.status === 'number',
								)?.extensions.http.status ??
								200;
							return HttpResponse.json(
								{
									...(o.data !== undefined && { data: o.data }),
									...(o.errors && { errors: o.errors }),
								},
								{ status },
							);
						},
						{ once: o.once ?? false },
					),
				);
			}
		},
		async handle(request: Request): Promise<Response | null> {
			const url = new URL(request.url);
			if (url.pathname !== path && !url.pathname.startsWith(`${path}/`))
				return null;
			if (isProduction()) return new Response(null, { status: 404 });
			const action = url.pathname.slice(path.length + 1);
			const known = ['reset', 'fail', 'scenario', 'override'];
			if (!known.includes(action)) return new Response(null, { status: 404 });
			if (request.method !== 'POST') {
				return Response.json(
					{ error: 'POST only' },
					{ status: 405, headers: { allow: 'POST' } },
				);
			}
			let body: any = {};
			const text = await request.text();
			if (text) {
				try {
					body = JSON.parse(text);
				} catch {
					return Response.json(
						{ error: 'The body is not JSON.' },
						{ status: 400 },
					);
				}
			}
			const bad = (error: string) => Response.json({ error }, { status: 400 });
			switch (action) {
				case 'reset':
					await control.reset();
					break;
				case 'fail': {
					const s = body?.status;
					if (s !== null && !(Number.isInteger(s) && s >= 100 && s <= 599))
						return bad('`status` must be an HTTP status (100-599) or null.');
					control.fail(s);
					break;
				}
				case 'scenario':
					if (typeof body?.name !== 'string')
						return bad('`name` must be a string.');
					try {
						await control.scenario(body.name, body.args);
					} catch (e) {
						if (e instanceof UnknownScenarioError)
							return Response.json({ error: e.message }, { status: 404 });
						throw e;
					}
					break;
				case 'override': {
					const list = Array.isArray(body) ? body : [body];
					if (!list.every((o) => typeof o?.operationName === 'string'))
						return bad('Each override needs an `operationName` string.');
					control.override(...list);
					break;
				}
			}
			return Response.json({ ok: true });
		},
	};
	return control;
}

export type MockControl = ReturnType<typeof createMockControl>;

import { describe, expect, test } from 'bun:test';
import { post, schema } from '../test/schema';
import { createMockControl } from './control';
import { createExecutor } from './executor';
import { createMockState } from './state';

const SSE = { accept: 'text/event-stream' };

function setup() {
	const state = createMockState();
	const execute = createExecutor({ schema, state });
	const run = (query: string, headers: Record<string, string> = SSE) =>
		execute({ query, request: post({ query }, headers) });
	return { run, state, execute };
}

describe('subscriptions over SSE', () => {
	test('streams next events, then complete', async () => {
		const { run, state } = setup();
		const response = await run('subscription { events { type text } }');
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('text/event-stream');
		expect(await response.text()).toBe(
			'event: next\ndata: {"data":{"events":{"type":"delta","text":"hi"}}}\n\n' +
				'event: next\ndata: {"data":{"events":{"type":"delta","text":" there"}}}\n\n' +
				'event: complete\ndata:\n\n',
		);
		expect(state.streams.size).toBe(0);
	});

	test('a refusal before the stream has a real status and headers', async () => {
		const { run } = setup();
		const response = await run('subscription { denied { type } }');
		expect(response.status).toBe(429);
		expect(response.headers.get('retry-after')).toBe('30');
		expect(response.headers.get('content-type')).toContain('application/json');
		const body = await response.json();
		expect(body.errors[0].message).toBe('rate-limited');
	});

	test('a failure mid-stream is an error payload, then complete', async () => {
		const { run } = setup();
		const text = await (await run('subscription { flaky { text } }')).text();
		expect(text).toContain('{"data":{"flaky":{"text":"one"}}}');
		expect(text).toContain('"errors":[{"message":"upstream lost"}]');
		expect(text.endsWith('event: complete\ndata:\n\n')).toBe(true);
	});

	test('validation still answers 400 before any stream', async () => {
		const { run } = setup();
		expect((await run('subscription { nope }')).status).toBe(400);
	});

	test('without the event-stream accept, nothing streams', async () => {
		const { run } = setup();
		const response = await run('subscription { events { type } }', {});
		expect(response.headers.get('content-type')).not.toContain('event-stream');
	});

	test('reset ends a live stream; the client reads a clean end', async () => {
		const state = createMockState();
		let returned = false;
		const live = createExecutor({
			schema: (await import('./schema')).buildMockSchema({
				typeDefs: 'type Query { a: Int } type Subscription { tick: Int }',
				resolvers: {
					Subscription: {
						tick: {
							subscribe: () => ({
								[Symbol.asyncIterator]() {
									let sent = false;
									return {
										next: () => {
											if (sent) return new Promise<never>(() => {});
											sent = true;
											return Promise.resolve({
												done: false,
												value: { tick: 1 },
											});
										},
										return: () => {
											returned = true;
											return Promise.resolve({ done: true, value: undefined });
										},
									};
								},
							}),
						},
					},
				},
			}),
			state,
		});
		const query = 'subscription { tick }';
		const response = await live({ query, request: post({ query }, SSE) });
		const reader = (response.body as ReadableStream<Uint8Array>).getReader();
		await reader.read();
		expect(state.streams.size).toBe(1);
		const control = createMockControl({
			server: { use() {}, resetHandlers() {} },
			state,
		});
		await control.reset();
		expect((await reader.read()).done).toBe(true);
		expect(state.streams.size).toBe(0);
		expect(returned).toBe(true);
	});

	test('a client abort ends the stream', async () => {
		const { execute, state } = setup();
		const abort = new AbortController();
		const query = 'subscription { events { type } }';
		const request = new Request('http://api.test/graphql', {
			method: 'POST',
			headers: { 'content-type': 'application/json', ...SSE },
			body: JSON.stringify({ query }),
			signal: abort.signal,
		});
		const response = await execute({ query, request });
		abort.abort();
		await response.body?.cancel().catch(() => {});
		expect(state.streams.size).toBe(0);
	});
});

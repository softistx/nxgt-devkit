import { expect, test } from 'bun:test';
import { getResponse, HttpResponse, http } from 'msw';
import { startMockServer } from './index';

// Bun logs msw 3's failure to patch node:net here; the server is still built.
test('starts a server holding the given handlers', async () => {
	const handlers = [http.get('http://x.test/a', () => HttpResponse.json({}))];
	const { server } = startMockServer(handlers);
	try {
		expect(server.listHandlers()).toHaveLength(1);
		expect(
			await getResponse(handlers, new Request('http://x.test/a')),
		).toBeDefined();
	} finally {
		server.close();
	}
});

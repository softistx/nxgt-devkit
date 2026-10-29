import { defineAppConfig } from '../src/config';

// `createMockServerTest(base, { scope: true })` lets the specs that change the
// server mocks run in parallel: two workers against the one server. The other
// mock-server config stays at one worker, which is what the unscoped fixture
// needs. `PW_PORT` as there.
const port = Number(process.env.PW_PORT) || 4599;

export default defineAppConfig({
	port,
	browsers: ['chromium'],
	testDir: './e2e',
	webServer: {
		command: 'bun server.ts',
		url: `http://localhost:${port}`,
		reuseExistingServer: !process.env.CI,
	},
	overrides: {
		testMatch: /mock-scope\.pw\.ts$/,
		workers: 2,
		fullyParallel: true,
		reporter: 'list',
		outputDir: '../.probe-results',
	},
});

import { defineAppConfig } from '../src/config';

// `mockServer` changes mocks that live in the app's one server process, so
// its specs cannot run in parallel against it: one worker, no phone project
// (the guide says the same to apps: `workers: 1`).
// `PW_PORT` moves the server and the URL together (server.ts reads it too), so
// two worktrees can run the suite at once: with `reuseExistingServer`, a fixed
// port makes the second run reuse the first one's server.
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
		testMatch: /mock-server\.pw\.ts$/,
		workers: 1,
		fullyParallel: false,
		reporter: 'list',
		outputDir: '../.probe-results',
	},
});

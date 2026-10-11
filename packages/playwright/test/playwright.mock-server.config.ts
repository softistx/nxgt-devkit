import { defineAppConfig } from '../src/config';

// `mockServer` changes mocks that live in the app's one server process, so
// its specs cannot run in parallel against it: one worker, no phone project
// (the guide says the same to apps: `workers: 1`).
export default defineAppConfig({
	port: 4599,
	browsers: ['chromium'],
	testDir: './e2e',
	webServer: {
		command: 'bun server.ts',
		url: 'http://localhost:4599',
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

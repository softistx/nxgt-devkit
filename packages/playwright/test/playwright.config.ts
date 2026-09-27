import { defineAppConfig } from '../src/config';

// The package's own config helper, driving its own specs.
export default defineAppConfig({
	port: 4599,
	browsers: ['chromium'],
	testDir: './e2e',
	webServer: {
		command: 'bun server.ts',
		url: 'http://localhost:4599',
		reuseExistingServer: !process.env.CI,
	},
	// `.pw.ts`, so `bun test` never picks these up.
	overrides: {
		testMatch: /\.pw\.ts$/,
		reporter: 'list',
		outputDir: '../.probe-results',
	},
});

import { defineConfig, devices } from '@playwright/test';

// A plain config: this package cannot depend on @nxgt/playwright, which
// depends on it.
export default defineConfig({
	testDir: '.',
	testMatch: /\.pw\.ts$/,
	reporter: 'list',
	outputDir: './.out/results',
	use: { baseURL: 'http://localhost:4598' },
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'bun server.ts',
		url: 'http://localhost:4598',
		// The bundle is built when the server starts: never reuse a server of
		// an earlier run, which would serve its old bundle.
		reuseExistingServer: false,
	},
});

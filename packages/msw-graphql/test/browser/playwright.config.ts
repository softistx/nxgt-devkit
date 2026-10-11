import { defineConfig, devices } from '@playwright/test';

// A plain config: this package cannot depend on @nxgt/playwright, which
// depends on it.
export default defineConfig({
	testDir: '.',
	testMatch: /\.pw\.ts$/,
	reporter: 'list',
	outputDir: '../.probe-results',
	use: { baseURL: 'http://localhost:4598' },
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'bun server.ts',
		url: 'http://localhost:4598',
		reuseExistingServer: !process.env.CI,
	},
});

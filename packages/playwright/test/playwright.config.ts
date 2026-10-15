import { defineAppConfig, selectedProjects } from '../src/config';

// The package's own config helper, driving its own specs.
// `PW_PORT` moves the server and the URL together (server.ts reads it too), so
// two worktrees can run the suite at once: with `reuseExistingServer`, a fixed
// port makes the second run reuse the first one's server.
const port = Number(process.env.PW_PORT) || 4599;

export default defineAppConfig({
	port,
	browsers: ['chromium'],
	// Every spec runs on a phone too: `mobile-chromium`, a Pixel 7.
	mobile: true,
	testDir: './e2e',
	webServer: {
		command: 'bun server.ts',
		url: `http://localhost:${port}`,
		reuseExistingServer: !process.env.CI,
	},
	// `saveScreen`'s default folder; saving is on with `SCREENS=1`.
	screens: { dir: '../.probe-screens' },
	// `.pw.ts`, so `bun test` never picks these up.
	overrides: {
		// The runner's answer, for `config.pw.ts` to compare its worker's with.
		metadata: { selectedInRunner: selectedProjects() },
		testMatch: /\.pw\.ts$/,
		// Server mocks are process-global: this spec runs alone, in
		// playwright.mock-server.config.ts, with one worker.
		testIgnore: /mock-server\.pw\.ts$/,
		reporter: 'list',
		outputDir: '../.probe-results',
	},
});

import { defineAppConfig, selectedProjects } from '../src/config';

// The package's own config helper, driving its own specs.
export default defineAppConfig({
	port: 4599,
	browsers: ['chromium'],
	// Every spec runs on a phone too: `mobile-chromium`, a Pixel 7.
	mobile: true,
	testDir: './e2e',
	webServer: {
		command: 'bun server.ts',
		url: 'http://localhost:4599',
		reuseExistingServer: !process.env.CI,
	},
	// `saveScreen`'s default folder; saving is on with `SCREENS=1`.
	screens: { dir: '../.probe-screens' },
	// `.pw.ts`, so `bun test` never picks these up.
	overrides: {
		// The runner's answer, for `config.pw.ts` to compare its worker's with.
		metadata: { selectedInRunner: selectedProjects() },
		testMatch: /\.pw\.ts$/,
		reporter: 'list',
		outputDir: '../.probe-results',
	},
});

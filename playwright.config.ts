import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	webServer: {
		command: 'pnpm preview --port 5173',
		port: 5173,
		reuseExistingServer: true
	},
	use: {
		hasTouch: true
	},
	testDir: 'tests',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;

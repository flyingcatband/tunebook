import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	define: {
		'import.meta.vitest': 'undefined'
	},
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{spec,test}.{js,ts}'],
		includeSource: ['src/**/*.{js,ts}']
	},
	server: {
		allowedHosts: ['.ngrok-free.app']
	}
});

import { purgeCss } from 'vite-plugin-tailwind-purgecss';
import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';

const config: UserConfig = {
	plugins: [sveltekit(), purgeCss()],
	build: {
		rollupOptions: {
			external: ['sharp']
		}
	}
};

export default config;

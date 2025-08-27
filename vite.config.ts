import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url';
import { mergeConfig, type UserConfig } from 'vite';

const config: UserConfig = {
	plugins: [tailwindcss(), sveltekit()],
	build: {
		rollupOptions: {
			external: ['sharp']
		}
	},
	server: {
		allowedHosts: true
	}
};

export default config;

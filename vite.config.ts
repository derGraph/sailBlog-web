import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { type UserConfig } from 'vite';

const config: UserConfig = {
  plugins: [tailwindcss(), sveltekit({ adapter: adapter(), preprocess: [vitePreprocess()] })],
  build: {
    rolldownOptions: {
      external: ['sharp']
    }
  },
  server: {
    allowedHosts: true
  }
};

export default config;

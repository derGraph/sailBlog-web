import { join } from 'path';
import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import { skeleton } from '@skeletonlabs/tw-plugin';
import { ocean } from './src/ocean';

export default {
	darkMode: 'class',
	content: [
		'./src/**/*.{html,js,svelte,ts,css}',
		join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts,css}')
	],
	theme: {
		extend: {}
	},
	plugins: [
		forms,
		typography,
		skeleton({
			themes: {
				custom: [ocean]
			}
		})
	]
} satisfies Config;

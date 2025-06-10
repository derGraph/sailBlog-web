import type { CustomThemeConfig } from '@skeletonlabs/tw-plugin';

export const ocean: CustomThemeConfig = {
	name: 'ocean',
	properties: {
		// =~= Theme Properties =~=
		'--theme-font-family-base': `system-ui`,
		'--theme-font-family-heading': `system-ui`,
		'--theme-font-color-base': '0 0 0',
		'--theme-font-color-dark': '255 255 255',
		'--theme-rounded-base': '9999px',
		'--theme-rounded-container': '12px',
		'--theme-border-base': '2px',
		// =~= Theme On-X Colors =~=
		'--on-primary': '0 0 0',
		'--on-secondary': '255 255 255',
		'--on-tertiary': '0 0 0',
		'--on-success': '0 0 0',
		'--on-warning': '0 0 0',
		'--on-error': '0 0 0',
		'--on-surface': '255 255 255',
		// =~= Theme Colors  =~=
		// primary | #96ded6
		'--color-primary-50': '239 250 249', // #effaf9
		'--color-primary-100': '234 248 247', // #eaf8f7
		'--color-primary-200': '229 247 245', // #e5f7f5
		'--color-primary-300': '213 242 239', // #d5f2ef
		'--color-primary-400': '182 232 226', // #b6e8e2
		'--color-primary-500': '150 222 214', // #96ded6
		'--color-primary-600': '135 200 193', // #87c8c1
		'--color-primary-700': '113 167 161', // #71a7a1
		'--color-primary-800': '90 133 128', // #5a8580
		'--color-primary-900': '74 109 105', // #4a6d69
		// secondary | #c20ce5
		'--color-secondary-50': '246 219 251', // #f6dbfb
		'--color-secondary-100': '243 206 250', // #f3cefa
		'--color-secondary-200': '240 194 249', // #f0c2f9
		'--color-secondary-300': '231 158 245', // #e79ef5
		'--color-secondary-400': '212 85 237', // #d455ed
		'--color-secondary-500': '194 12 229', // #c20ce5
		'--color-secondary-600': '175 11 206', // #af0bce
		'--color-secondary-700': '146 9 172', // #9209ac
		'--color-secondary-800': '116 7 137', // #740789
		'--color-secondary-900': '95 6 112', // #5f0670
		// tertiary | #52f6ab
		'--color-tertiary-50': '229 254 242', // #e5fef2
		'--color-tertiary-100': '220 253 238', // #dcfdee
		'--color-tertiary-200': '212 253 234', // #d4fdea
		'--color-tertiary-300': '186 251 221', // #bafbdd
		'--color-tertiary-400': '134 249 196', // #86f9c4
		'--color-tertiary-500': '82 246 171', // #52f6ab
		'--color-tertiary-600': '74 221 154', // #4add9a
		'--color-tertiary-700': '62 185 128', // #3eb980
		'--color-tertiary-800': '49 148 103', // #319467
		'--color-tertiary-900': '40 121 84', // #287954
		// success | #5cb85c
		'--color-success-50': '231 244 231', // #e7f4e7
		'--color-success-100': '222 241 222', // #def1de
		'--color-success-200': '214 237 214', // #d6edd6
		'--color-success-300': '190 227 190', // #bee3be
		'--color-success-400': '141 205 141', // #8dcd8d
		'--color-success-500': '92 184 92', // #5cb85c
		'--color-success-600': '83 166 83', // #53a653
		'--color-success-700': '69 138 69', // #458a45
		'--color-success-800': '55 110 55', // #376e37
		'--color-success-900': '45 90 45', // #2d5a2d
		// warning | #bdff56
		'--color-warning-50': '245 255 230', // #f5ffe6
		'--color-warning-100': '242 255 221', // #f2ffdd
		'--color-warning-200': '239 255 213', // #efffd5
		'--color-warning-300': '229 255 187', // #e5ffbb
		'--color-warning-400': '209 255 137', // #d1ff89
		'--color-warning-500': '189 255 86', // #bdff56
		'--color-warning-600': '170 230 77', // #aae64d
		'--color-warning-700': '142 191 65', // #8ebf41
		'--color-warning-800': '113 153 52', // #719934
		'--color-warning-900': '93 125 42', // #5d7d2a
		// error | #ff0f0f
		'--color-error-50': '255 219 219', // #ffdbdb
		'--color-error-100': '255 207 207', // #ffcfcf
		'--color-error-200': '255 195 195', // #ffc3c3
		'--color-error-300': '255 159 159', // #ff9f9f
		'--color-error-400': '255 87 87', // #ff5757
		'--color-error-500': '255 15 15', // #ff0f0f
		'--color-error-600': '230 14 14', // #e60e0e
		'--color-error-700': '191 11 11', // #bf0b0b
		'--color-error-800': '153 9 9', // #990909
		'--color-error-900': '125 7 7', // #7d0707
		// surface | #7057ff
		'--color-surface-50': '234 230 255', // #eae6ff
		'--color-surface-100': '226 221 255', // #e2ddff
		'--color-surface-200': '219 213 255', // #dbd5ff
		'--color-surface-300': '198 188 255', // #c6bcff
		'--color-surface-400': '155 137 255', // #9b89ff
		'--color-surface-500': '112 87 255', // #7057ff
		'--color-surface-600': '101 78 230', // #654ee6
		'--color-surface-700': '84 65 191', // #5441bf
		'--color-surface-800': '67 52 153', // #433499
		'--color-surface-900': '55 43 125' // #372b7d
	}
};
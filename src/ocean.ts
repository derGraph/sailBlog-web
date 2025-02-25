import type { CustomThemeConfig } from '@skeletonlabs/tw-plugin';

function rgbToTailwind(rgb: string): string {
    // Extrahiere die Zahlen aus "rgb(r, g, b)"
    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) {
        throw new Error("Ungültiges RGB-Format: " + rgb);
    }
    return `${match[0]} ${match[1]} ${match[2]}`;
}

export const ocean: CustomThemeConfig = {
	name: 'ocean',
	properties: {
		// =~= Theme Properties =~=
		'--theme-font-family-base': `system-ui`,
        '--theme-font-family-heading': `system-ui`,
        '--theme-font-color-base': rgbToTailwind("rgb(0, 0, 0)"),
        '--theme-font-color-dark': rgbToTailwind("rgb(255, 255, 255)"),
        '--theme-rounded-base': '9999px',
        '--theme-rounded-container': '12px',
        '--theme-border-base': '2px',
		// =~= Theme On-X Colors =~=
		'--on-primary': rgbToTailwind("rgb(0, 0, 0)"),
        '--on-secondary': rgbToTailwind("rgb(255, 255, 255)"),
        '--on-tertiary': rgbToTailwind("rgb(0, 0, 0)"),
        '--on-success': rgbToTailwind("rgb(0, 0, 0)"),
        '--on-warning': rgbToTailwind("rgb(0, 0, 0)"),
        '--on-error': rgbToTailwind("rgb(0, 0, 0)"),
        '--on-surface': rgbToTailwind("rgb(255, 255, 255)"),
		// =~= Theme Colors  =~=
		// primary | #96ded6
		'--color-primary-50': rgbToTailwind("rgb(250, 239, 239)"),
        '--color-primary-100': rgbToTailwind("rgb(234, 248, 247)"),
        '--color-primary-200': rgbToTailwind("rgb(229, 247, 245)"),
        '--color-primary-300': rgbToTailwind("rgb(213, 242, 239)"),
        '--color-primary-400': rgbToTailwind("rgb(182, 232, 226)"),
        '--color-primary-500': rgbToTailwind("rgb(30, 140, 181)"),//field border highlighted
        '--color-primary-600': rgbToTailwind("rgb(135, 200, 193)"),
        '--color-primary-700': rgbToTailwind("rgb(113, 167, 161)"),
        '--color-primary-800': rgbToTailwind("rgb(90, 133, 128)"),
        '--color-primary-900': rgbToTailwind("rgb(74, 109, 105)"),
		// secondary | #c20ce5
		'--color-secondary-50': rgbToTailwind("rgb(246, 219, 251)"),
        '--color-secondary-100': rgbToTailwind("rgb(243, 206, 250)"),
        '--color-secondary-200': rgbToTailwind("rgb(240, 194, 249)"),
        '--color-secondary-300': rgbToTailwind("rgb(231, 158, 245)"),
        '--color-secondary-400': rgbToTailwind("rgb(212, 85, 237)"),
        '--color-secondary-500': rgbToTailwind("rgb(115, 153, 178)"),//sign-buttons
        '--color-secondary-600': rgbToTailwind("rgb(175, 11, 206)"),
        '--color-secondary-700': rgbToTailwind("rgb(146, 9, 172)"),
        '--color-secondary-800': rgbToTailwind("rgb(116, 7, 137)"),
        '--color-secondary-900': rgbToTailwind("rgb(95, 6, 112)"),
		// tertiary | #52f6ab
		'--color-tertiary-50': rgbToTailwind("rgb(229, 254, 242)"),
        '--color-tertiary-100': rgbToTailwind("rgb(220, 253, 238)"),
        '--color-tertiary-200': rgbToTailwind("rgb(212, 253, 234)"),
        '--color-tertiary-300': rgbToTailwind("rgb(186, 251, 221)"),
        '--color-tertiary-400': rgbToTailwind("rgb(134, 249, 196)"),
        '--color-tertiary-500': rgbToTailwind("rgb(82, 246, 171)"),
        '--color-tertiary-600': rgbToTailwind("rgb(74, 221, 154)"),
        '--color-tertiary-700': rgbToTailwind("rgb(62, 185, 128)"),
        '--color-tertiary-800': rgbToTailwind("rgb(49, 148, 103)"),
        '--color-tertiary-900': rgbToTailwind("rgb(40, 121, 84)"),
		// success | #5cb85c
		'--color-success-50': rgbToTailwind("rgb(231, 244, 231)"),
        '--color-success-100': rgbToTailwind("rgb(222, 241, 222)"),
        '--color-success-200': rgbToTailwind("rgb(214, 237, 214)"),
        '--color-success-300': rgbToTailwind("rgb(190, 227, 190)"),
        '--color-success-400': rgbToTailwind("rgb(141, 205, 141)"),
        '--color-success-500': rgbToTailwind("rgb(92, 184, 92)"),
        '--color-success-600': rgbToTailwind("rgb(83, 166, 83)"),
        '--color-success-700': rgbToTailwind("rgb(69, 138, 69)"),
        '--color-success-800': rgbToTailwind("rgb(55, 110, 55)"),
        '--color-success-900': rgbToTailwind("rgb(45, 90, 45)"),
		// warning | #bdff56
		'--color-warning-50': rgbToTailwind("rgb(245, 255, 230)"),
		'--color-warning-100': rgbToTailwind("rgb(242, 255, 221)"),
		'--color-warning-200': rgbToTailwind("rgb(239, 255, 213)"),
		'--color-warning-300': rgbToTailwind("rgb(229, 255, 187)"),
		'--color-warning-400': rgbToTailwind("rgb(209, 255, 137)"),
		'--color-warning-500': rgbToTailwind("rgb(232, 218, 67)"),
		'--color-warning-600': rgbToTailwind("rgb(238, 219, 7)"),
		'--color-warning-700': rgbToTailwind("rgb(197, 181, 8)"),
		'--color-warning-800': rgbToTailwind("rgb(173, 161, 27)"),
		'--color-warning-900': rgbToTailwind("rgb(139, 128, 10)"),
		// error | #ff0f0f
		'--color-error-50': rgbToTailwind("rgb(255, 219, 219)"),
		'--color-error-100': rgbToTailwind("rgb(255, 207, 207)"),
		'--color-error-200': rgbToTailwind("rgb(255, 195, 195)"),
		'--color-error-300': rgbToTailwind("rgb(255, 159, 159)"),
		'--color-error-400': rgbToTailwind("rgb(255, 87, 87)"),
		'--color-error-500': rgbToTailwind("rgb(255, 15, 15)"),
		'--color-error-600': rgbToTailwind("rgb(230, 14, 14)"),
		'--color-error-700': rgbToTailwind("rgb(191, 11, 11)"),
		'--color-error-800': rgbToTailwind("rgb(153, 9, 9)"),
		'--color-error-900': rgbToTailwind("rgb(125, 7, 7)"),
		// surface | #7057ff
		'--color-surface-50': rgbToTailwind("rgb(100, 147, 161)"),
		'--color-surface-100': rgbToTailwind("rgb(226, 221, 255)"),
		'--color-surface-200': rgbToTailwind("rgb(219, 213, 255)"),
		'--color-surface-300': rgbToTailwind("rgb(198, 188, 255)"),
		'--color-surface-400': rgbToTailwind("rgb(125, 125, 125)"),//field placeholder font color
		'--color-surface-500': rgbToTailwind("rgb(43, 78, 95)"),//field border not highlited
		'--color-surface-600': rgbToTailwind("rgb(84, 84, 185)"),//button seperation
		'--color-surface-700': rgbToTailwind("rgb(24, 18, 63)"),//field fill
		'--color-surface-800': rgbToTailwind("rgb(36, 32, 61)"),
		'--color-surface-900': rgbToTailwind("rgb(51, 46, 46)")
	}
};


//Ergebnisse der Umfragen:
//100% der Teilnehmer würden auf der neuen Seite mehr Geld in zukünftigen In-App-Käufen ausgeben
//n = 1

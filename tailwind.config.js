/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			primary: {
  				50: 'rgb(var(--color-primary-50) / <alpha-value>)',
  				100: 'rgb(var(--color-primary-100) / <alpha-value>)',
  				500: 'rgb(var(--color-primary-500) / <alpha-value>)',
  				600: 'rgb(var(--color-primary-600) / <alpha-value>)',
  				700: 'rgb(var(--color-primary-700) / <alpha-value>)',
  				900: 'rgb(var(--color-primary-900) / <alpha-value>)',
  				DEFAULT: 'rgb(var(--primary))',
  				foreground: 'rgb(var(--primary-foreground))'
  			},
  			neutral: {
  				50: 'rgb(var(--color-neutral-50) / <alpha-value>)',
  				100: 'rgb(var(--color-neutral-100) / <alpha-value>)',
  				200: 'rgb(var(--color-neutral-200) / <alpha-value>)',
  				500: 'rgb(var(--color-neutral-500) / <alpha-value>)',
  				600: 'rgb(var(--color-neutral-600) / <alpha-value>)',
  				900: 'rgb(var(--color-neutral-900) / <alpha-value>)',
  			},
  			background: 'rgb(var(--color-background))',
  			foreground: 'rgb(var(--color-foreground))',
  			card: {
  				DEFAULT: 'rgb(var(--card))',
  				foreground: 'rgb(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'rgb(var(--popover))',
  				foreground: 'rgb(var(--popover-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'rgb(var(--secondary))',
  				foreground: 'rgb(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'rgb(var(--muted))',
  				foreground: 'rgb(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'rgb(var(--accent))',
  				foreground: 'rgb(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'rgb(var(--destructive))',
  				foreground: 'rgb(var(--destructive-foreground))'
  			},
  			border: 'rgb(var(--border))',
  			input: 'rgb(var(--input))',
  			ring: 'rgb(var(--ring))'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'oklch(12% 0.008 155)',
        sidebar: 'oklch(9% 0.006 155)',
        surface: 'oklch(17% 0.01 155)',
        'surface-2': 'oklch(21% 0.012 155)',
        input: 'oklch(14% 0.007 155)',
        text: 'oklch(94% 0.005 155)',
        muted: 'oklch(70% 0.008 155)',
        quiet: 'oklch(50% 0.006 155)',
        faint: 'oklch(37% 0.004 155)',
        line: 'oklch(23% 0.008 155)',
        'line-soft': 'oklch(18% 0.006 155)',
        green: 'oklch(72% 0.16 155)',
        'green-bg': 'oklch(23% 0.035 155)',
        gold: 'oklch(76% 0.14 80)',
        'gold-bg': 'oklch(23% 0.035 80)',
        brown: 'oklch(60% 0.08 50)',
        'brown-bg': 'oklch(23% 0.03 50)',
        blue: 'oklch(65% 0.14 250)',
        'blue-bg': 'oklch(23% 0.035 250)',
        red: {
          DEFAULT: 'oklch(62% 0.2 25)',
          50: 'oklch(95% 0.02 25)',
          100: 'oklch(90% 0.04 25)',
          200: 'oklch(80% 0.08 25)',
          300: 'oklch(70% 0.12 25)',
          400: 'oklch(65% 0.16 25)',
          500: 'oklch(62% 0.2 25)',
          600: 'oklch(55% 0.18 25)',
          700: 'oklch(45% 0.15 25)',
          800: 'oklch(35% 0.12 25)',
          900: 'oklch(25% 0.1 25)',
          950: 'oklch(15% 0.08 25)',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        r: '12px',
      },
      transitionTimingFunction: {
        ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      boxShadow: {
        'card': '0 2px 8px oklch(20% 0.02 155 / 0.06)',
        'card-hover': '0 10px 28px oklch(20% 0.02 155 / 0.10)',
      },
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        night: 'oklch(14% .025 151)',
        night2: 'oklch(18% .028 151)',
        deep: 'oklch(21% .03 151)',
        cream: 'oklch(95% .025 91)',
        paper: 'oklch(91% .035 91)',
        ink: 'oklch(23% .035 151)',
        muted: 'oklch(65% .028 151)',
        line: 'oklch(82% .03 91)',
        gold: 'oklch(75% .14 84)',
        gold2: 'oklch(84% .12 84)',
        green: 'oklch(55% .13 151)',
        green2: 'oklch(69% .12 151)',
        earth: 'oklch(48% .10 55)',
        red: 'oklch(62% .15 28)',
        blue: 'oklch(55% .14 240)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      animation: {
        rise: 'rise .35s cubic-bezier(.16,1,.3,1)',
        sheet: 'sheet .35s cubic-bezier(.16,1,.3,1)',
        float: 'float 3s ease-in-out infinite',
      },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(9px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        sheet: { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
    },
  },
  plugins: [],
}

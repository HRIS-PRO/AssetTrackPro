/** @type {import('tailwindcss').Config} */

// The `blue` scale is remapped to the --brand-* CSS variables so the org
// theme selected in Settings recolors every blue-* utility app-wide.
const brand = (shade) => `rgb(var(--brand-${shade}) / <alpha-value>)`;

export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          50: brand(50),
          100: brand(100),
          200: brand(200),
          300: brand(300),
          400: brand(400),
          500: brand(500),
          600: brand(600),
          700: brand(700),
          800: brand(800),
          900: brand(900),
          950: brand(950),
          DEFAULT: brand(600),
        },
      },
    },
  },
  plugins: [],
}

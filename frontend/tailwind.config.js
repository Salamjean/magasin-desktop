/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36abf7',
          500: '#0056a6', // Deep primary blue
          600: '#004482',
          700: '#003366',
          800: '#00254c',
          900: '#001833',
          DEFAULT: '#0056a6',
          hover: '#004482',
          dark: '#003366',
          light: '#e8f1fa'
        },
        sidebar: {
          DEFAULT: '#0f172a',
          card: '#1e293b',
          hover: '#334155'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 2px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'floating': '0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'glow-primary': '0 0 20px rgba(0, 86, 166, 0.25)',
      }
    },
  },
  plugins: [],
}

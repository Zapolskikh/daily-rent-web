/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1a8c3f',
          50:  '#edf9f2',
          100: '#ccf0d8',
          200: '#97e2b4',
          300: '#57cc86',
          400: '#2ab45e',
          500: '#1a8c3f',
          600: '#157033',
          700: '#105528',
          800: '#0a3a1b',
          900: '#061f0e',
        },
        accent: {
          DEFAULT: '#78bf2e',
          light: '#eaf5d2',
          dark: '#5a9920',
        },
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.06), 0 4px 24px rgba(26,140,63,0.09)',
        'card-hover': '0 8px 40px rgba(26,140,63,0.18), 0 2px 8px rgba(0,0,0,0.06)',
        'btn':        '0 2px 8px rgba(26,140,63,0.30)',
        'btn-hover':  '0 4px 18px rgba(26,140,63,0.40)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'mesh': [
          'radial-gradient(ellipse 80% 60% at 5% 15%, rgba(26,140,63,0.10) 0%, transparent 60%)',
          'radial-gradient(ellipse 60% 80% at 95% 5%, rgba(120,191,46,0.07) 0%, transparent 60%)',
          'radial-gradient(ellipse 70% 50% at 50% 95%, rgba(26,140,63,0.07) 0%, transparent 60%)',
          'radial-gradient(ellipse 40% 40% at 80% 45%, rgba(26,140,63,0.05) 0%, transparent 60%)',
        ].join(', '),
      },
    },
  },
  plugins: [],
}

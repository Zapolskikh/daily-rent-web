/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0d9488',
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        accent: {
          DEFAULT: '#f59e0b',
          light: '#fef3c7',
          dark: '#d97706',
        },
      },
      boxShadow: {
        'card':       '0 1px 2px rgba(0,0,0,0.04), 0 4px 24px rgba(13,148,136,0.09)',
        'card-hover': '0 8px 40px rgba(13,148,136,0.18), 0 2px 8px rgba(0,0,0,0.07)',
        'btn':        '0 2px 8px rgba(13,148,136,0.35)',
        'btn-hover':  '0 4px 18px rgba(13,148,136,0.45)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'mesh': [
          'radial-gradient(ellipse 80% 60% at 5% 15%, rgba(20,184,166,0.13) 0%, transparent 60%)',
          'radial-gradient(ellipse 60% 80% at 95% 5%, rgba(6,182,212,0.09) 0%, transparent 60%)',
          'radial-gradient(ellipse 70% 50% at 50% 95%, rgba(16,185,129,0.08) 0%, transparent 60%)',
          'radial-gradient(ellipse 40% 40% at 80% 45%, rgba(20,184,166,0.06) 0%, transparent 60%)',
        ].join(', '),
      },
    },
  },
  plugins: [],
}

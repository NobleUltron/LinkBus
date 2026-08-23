export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        gold: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
        },
        app: 'var(--bg-color)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        line: 'var(--border-color)',
        fg: 'var(--text-color)',
        muted: 'var(--text-muted)',
        faint: 'var(--text-faint)',
      },
      spacing: {
        4.5: '1.125rem',
        5.5: '1.375rem',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.12)',
        lift: '0 12px 32px -12px rgba(15, 23, 42, 0.22)',
        glow: '0 8px 24px -8px rgba(22, 163, 74, 0.5)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      keyframes: {
        'dot-bounce': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%': { transform: 'translateY(-6px)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

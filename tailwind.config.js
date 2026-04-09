/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: '#0A0B0D',
        surface: '#111317',
        elevated: '#171A1F',
        borderSubtle: '#232730',
        borderStrong: '#343A46',
        textPrimary: '#F5F7FA',
        textSecondary: '#C5CBD5',
        textMuted: '#8A93A3',
        accentYellow: '#E8C547',
        statusLive: '#FF5A36',
      },
      boxShadow: {
        surface: '0 2px 8px rgba(0,0,0,0.25)',
        elevated: '0 8px 24px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
}

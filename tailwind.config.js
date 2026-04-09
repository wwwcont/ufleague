/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: '#121212',
        surface: '#1A1A1A',
        elevated: '#232323',
        borderSubtle: '#2F2F2F',
        borderStrong: '#3B3B3B',
        textPrimary: '#F5F5F5',
        textSecondary: '#C9C9C9',
        textMuted: '#8E8E8E',
        accentYellow: '#E8C547',
        statusLive: '#FF5A36',
      },
      boxShadow: {
        surface: '0 1px 6px rgba(0,0,0,0.18)',
        elevated: '0 4px 14px rgba(0,0,0,0.24)',
      },
    },
  },
  plugins: [],
}

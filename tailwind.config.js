/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: '#101010',
        mutedBg: '#151515',
        panelBg: '#1b1b1b',
        panelSoft: '#242424',
        textPrimary: '#f2f2f2',
        textSecondary: '#cccccc',
        textMuted: '#9a9a9a',
        borderSubtle: '#2c2c2c',
        borderStrong: '#3a3a3a',
        accentYellow: '#e3c14b',
        accentYellowSoft: '#8f7a34',
        statusLive: '#ef5350',
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '18px',
      },
      spacing: {
        4.5: '1.125rem',
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.6rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
      },
      boxShadow: {
        matte: '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 18px rgba(0,0,0,0.22)',
        soft: '0 1px 0 rgba(255,255,255,0.02) inset',
      },
    },
  },
  plugins: [],
}

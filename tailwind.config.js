/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./*.js"],
  theme: {
    extend: {
      colors: {
        lux: {
          dark: '#202020',
          soft: '#f5f7fb',
          surface: '#ffffff',
          'surface-soft': '#eef0f4',
          text: '#0f172a',
          'text-muted': '#6b7280',
          blue: {
            500: '#1f73f1',
            700: '#1554aa',
          },
          green: {
            500: '#2aad1f',
            700: '#1e7f17',
          },
          red: {
            500: '#e11d1d',
          },
          purple: {
            500: '#7c3aed',
          },
          gray: {
            500: '#8d96a7',
          }
        }
      },
      fontFamily: {
        title: ["\"Aptos Display\"", "\"Trebuchet MS\"", "Segoe UI", "sans-serif"],
        body: ["Aptos", "\"Trebuchet MS\"", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        'lux-lg': '28px',
        'lux-xl': '36px',
      },
      boxShadow: {
        'lux': '0 26px 55px rgba(15, 23, 42, 0.12)',
      },
      maxWidth: {
        'lux-content': '1360px',
      }
    },
  },
  plugins: [],
}

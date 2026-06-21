/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js}',
    './src/**/*.html'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F4E5EC',
          100: '#EBD8E0',
          200: '#D7B1C1',
          300: '#C38AA2',
          400: '#AF6383',
          500: '#9B3C64',
          600: '#7A3B58',
          700: '#54283D',
          800: '#3A1B2A',
          900: '#2B1F26',
          DEFAULT: '#7A3B58'
        },
        surface: '#f8f9fb',
        'surface-container': '#ffffff',
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a'
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706'
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626'
        }
      },
      borderRadius: {
        custom: '8px'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
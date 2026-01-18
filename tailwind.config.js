/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'blckbx': {
          'black': '#1D1C1B',
          'sand': '#F5F3F0',
          'dark-sand': '#E8E5E0',
          'sand-900': '#2D2C29',
          'cta': '#E6B148',
          'alert': '#E23737',
          // New state colors
          'success': '#1EA988',
          'success-light': '#5BBEA6',
          'green': '#1EA988',
          'green-light': '#5BBEA6',
          'warning': '#F4A858',
          'warning-light': '#FFBB95',
          'warning-dark': '#E9722F',
          'error': '#E23737',
          'mint': '#C0BDBD',
          // Assistant colors
          'assistant-light': '#D6FEFF',
          'assistant-dark': '#274346',
        }
      },
      fontFamily: {
        'display': ['var(--font-display)', 'serif'],
        'body': ['var(--font-body)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

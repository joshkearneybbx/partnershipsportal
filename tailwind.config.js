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
          'black': '#1C1D1F',
          'sand': '#F5F3F0',
          'dark-sand': '#E8E5E0',
          'cta': '#6B1488',
          'alert': '#FFBB95',
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

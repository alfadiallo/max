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
        brand: {
          pink: '#C03F8B',
          'pink-dark': '#A03370',
          'pink-light': '#D05FA5',
        },
        keyelements: {
          text: '#212121',
          'text-light': '#666666',
          background: '#E1E1E1',
        }
      }
    },
  },
  plugins: [],
}


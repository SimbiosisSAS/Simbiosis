/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          white: '#fefefe',
          red: '#fa3331',
          orange: '#fd8d11',
          gray: '#818181',
          coral: '#fda990',
        }
      }
    },
  },
  plugins: [],
};

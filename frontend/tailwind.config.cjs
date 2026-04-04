/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#0d0d0d',
        card: '#141414',
        gold: '#e5a00d',
        border: '#252525'
      }
    },
  },
  plugins: [],
}

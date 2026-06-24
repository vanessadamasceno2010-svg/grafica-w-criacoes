/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1e3a8a',
        gold: '#f59e0b',
        success: '#10b981',
      },
      fontFamily: {
        display: ['Playfair Display', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 10px 15px -3px rgb(0 0 0 / 0.05)',
      }
    },
  },
  plugins: [],
}

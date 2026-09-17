/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0f172a',
          surface: '#1e293b',
          card: '#182234',
          border: '#334155',
          primary: '#38bdf8',
          accent: '#0284c7',
        }
      }
    },
  },
  plugins: [],
}

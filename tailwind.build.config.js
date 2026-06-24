/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/static/member-app.js',
    './public/static/admin-app.js',
    './public/static/campus-app.js',
    './src/**/*.{tsx,ts,js}',
  ],
  theme: {
    extend: {
      colors: {
        rouge: { 400:'#A02820', 500:'#791E15', 600:'#5A1510' },
        dark:  { 900:'#02072C', 800:'#040B24', 700:'#0A1240', 600:'#12185A' }
      }
    }
  },
  plugins: [],
}

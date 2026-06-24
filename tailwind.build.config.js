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
        // Couleurs membre / admin / campus
        rouge: { 400:'#A02820', 500:'#791E15', 600:'#5A1510', DEFAULT:'#791E15', light:'#A02820', dark:'#5A1510' },
        dark:  { 900:'#02072C', 800:'#040B24', 700:'#0A1240', 600:'#12185A' },
        // Couleurs landing
        bleu:       { nuit:'#02072C', medium:'#0A1240', clair:'#1A2560' },
        anthracite: { DEFAULT:'#1D1D1B' },
        cream:      { DEFAULT:'#F5F0E8', muted:'#9A9080' },
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
      }
    }
  },
  plugins: [],
}

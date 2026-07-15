/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html", // Varsa CRA için
    "./index.html"         // Varsa Vite için
  ],
  theme: {
    extend: {
      // 🎯 İŞTE SİHİRLİ DOKUNUŞ BURASI
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
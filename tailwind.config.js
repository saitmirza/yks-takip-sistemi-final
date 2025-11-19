/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind'in class'ları arayacağı dosyalar (content)
  // Bu ayar, Tailwind'in src/ klasöründeki tüm .jsx, .js, .ts, .tsx dosyaları
  // ve index.html dosyasını tarayarak stil sınıflarını bulmasını sağlar.
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
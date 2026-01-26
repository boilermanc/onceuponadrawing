/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './*.{ts,tsx,jsx,js}',
    './{components,hooks,services,supabase,frontend-examples}/**/*.{ts,tsx,jsx,js}',
  ],
  theme: {
    extend: {
      colors: {
        'gunmetal': '#393d3f',
        'off-white': '#fdfdff',
        'silver': '#c6c5b9',
        'pacific-cyan': '#62929e',
        'blue-slate': '#546a7b',
        'soft-gold': '#d4a574',
      },
    },
  },
  plugins: [],
};

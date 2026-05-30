/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './newtab/**/*.{ts,tsx,html}',
    './popup/**/*.{ts,tsx,html}',
    './content/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        yt: {
          bg: '#0f0f0f',
          card: '#1a1a1a',
          border: '#272727',
          hover: '#272727',
          red: '#ff0000',
          text: '#f1f1f1',
          muted: '#aaaaaa',
        },
      },
      fontFamily: {
        sans: ['"YouTube Sans"', 'Roboto', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

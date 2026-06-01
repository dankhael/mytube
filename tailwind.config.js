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
        // Mapped to the OKLCH token layer in newtab/index.css, so changing
        // --accent-h there re-themes every Tailwind class too.
        yt: {
          bg: 'var(--bg)',
          card: 'var(--surface)',
          border: 'var(--border)',
          hover: 'var(--surface-2)',
          red: 'var(--accent)', // legacy name → now the brand accent
          text: 'var(--text)',
          muted: 'var(--text-3)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          ink: 'var(--accent-ink)',
          soft: 'var(--accent-soft)',
          line: 'var(--accent-line)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          elev: 'var(--elev)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: 'var(--radius-sm)',
        '2xl': 'var(--radius)',
      },
    },
  },
  plugins: [],
}

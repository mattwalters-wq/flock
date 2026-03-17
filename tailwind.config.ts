import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      /*
       * No custom theme extensions needed.
       * All tenant colours are applied via CSS variables set by layout.tsx.
       * Reference them in components with Tailwind's arbitrary-value syntax:
       *   text-[var(--color-ink)]
       *   bg-[var(--color-cream)]
       *   border-[var(--color-border)]
       */
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config

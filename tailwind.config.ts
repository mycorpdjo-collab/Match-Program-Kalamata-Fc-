import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#231f20',
        gold: '#d2ab67',
        'gold-text': '#8a6a2f',
        stage: '#e9e8e8',
        'ink-80': '#4f4b4c',
        'ink-60': '#7b7979',
        slot: '#dcdbdb',
      },
      fontFamily: {
        brand: ['Manrope', 'system-ui', 'sans-serif'],
        cond: ['"Fira Sans Extra Condensed"', 'Arial Narrow', 'sans-serif'],
        sans: ['"Helvetica Neue"', 'Helvetica', 'Inter', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;

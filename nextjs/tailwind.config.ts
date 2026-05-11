import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          50:  '#f4f1fb',
          100: '#e8e0f5',
          200: '#d0bfeb',
          300: '#b090da',
          400: '#8f5ec5',
          500: '#7038b0',
          600: '#5a2496',
          700: '#461a7a',
          800: '#3b1566',
          900: '#2e0f52',
          950: '#1a0730',
        },
        gold: {
          300: '#f5d87a',
          400: '#ecc44a',
          500: '#c9a227',
          600: '#a07c18',
        },
      },
      boxShadow: {
        'glow-brand': '0 0 30px rgba(70, 26, 122, 0.3)',
        'glow-gold':  '0 0 20px rgba(201, 162, 39, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-up':  'fade-up 0.6s ease-out forwards',
        'fade-in':  'fade-in 0.4s ease-out forwards',
        'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.6', transform: 'scale(0.8)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

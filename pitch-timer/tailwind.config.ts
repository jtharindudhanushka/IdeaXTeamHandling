import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"TT Hoves"', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        hackx: {
          void: '#010814',
          navy: '#031733',
          cobalt: '#1A6FD4',
          arc: '#5BB8FF',
          slate: '#0E233D',
        }
      },
      backgroundImage: {
        'underwater-radial': 'radial-gradient(circle at center, #031733 0%, #010814 100%)',
      },
      animation: {
        'float': 'float 20s ease-in-out infinite',
        'float-delayed': 'float 20s ease-in-out 10s infinite',
        'spin-y': 'spin-y 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(5%, 10%) scale(1.1)' },
          '66%': { transform: 'translate(-5%, 5%) scale(0.9)' },
        },
        'spin-y': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;

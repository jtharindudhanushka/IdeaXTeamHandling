import type { Config } from "tailwindcss";

// Colors resolve to CSS variables set per event + theme in app/globals.css.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        canvas: token("canvas"),
        surface: token("surface"),
        surface2: token("surface2"),
        line: token("line"),
        ink: token("ink"),
        muted: token("muted"),
        accent: token("accent"),
        fill: token("fill"),
        "fill-ink": token("fill-ink"),
        track: token("track"),
        warn: token("warn"),
        danger: token("danger"),
      },
    },
  },
  plugins: [],
};
export default config;

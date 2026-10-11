import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0f",
        surface: "#13131a",
        surface2: "#1c1c25",
        border: "#2a2a36",
        text: "#e8e8ee",
        muted: "#8a8a99",
        accent: "#7c5cff",
        accent2: "#22d3ee",
        yes: "#22c55e",
        no: "#ef4444",
      },
    },
  },
  plugins: [],
};
export default config;

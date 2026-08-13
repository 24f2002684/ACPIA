import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        forest: {
          background: "#1A3A2A",
          card: "#132B1F",
          surface: "#234935",
          border: "#2D5941",
          text: "#E6F0EA",
          muted: "#A3C2B0",
          accent: "#97BC62",
          "accent-hover": "#A7CC72",
          "accent-light": "#C5E197",
          "accent-dark": "#7A9E48",
        },
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(151, 188, 98, 0.3)",
        "glow-lg": "0 0 35px 0px rgba(151, 188, 98, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;

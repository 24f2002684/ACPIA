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
          dark: "#1A3A2A",      // Dark forest green background
          mid: "#2C5F2D",       // Mid forest green card/surface
          accent: "#97BC62",    // Vibrant accent
          light: "#F0F5F0",     // Light background/text
          card: "#1E4231",      // Deep surface
          border: "#3B7A3E",    // Subtle green border
        },
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(151, 188, 98, 0.3)",
        "glow-lg": "0 0 35px 0px rgba(151, 188, 98, 0.45)",
        pitch: "0 10px 30px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;

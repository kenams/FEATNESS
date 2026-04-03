import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        featness: {
          gold: "#c9a646",
          ink: "#0c1412",
          panel: "#13211d",
          muted: "#6c867f",
          line: "rgba(255,255,255,0.08)",
        },
      },
    },
  },
  plugins: [],
};

export default config;

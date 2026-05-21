import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#10161f",
        panel: "#151d29",
        panel2: "#1c2635",
        border: "#2b3748",
        text: "#d9e2ef",
        muted: "#8ea0b7",
        accent: "#22c55e",
        amber: "#f59e0b",
        danger: "#ef4444",
        cyan: "#38bdf8"
      }
    }
  },
  plugins: []
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F5F1",
        ink: "#141712",
        forest: {
          DEFAULT: "#0E4B36",
          light: "#166B4E",
          dark: "#0A3527",
        },
        marigold: {
          DEFAULT: "#E2A73E",
          light: "#F0C878",
          dark: "#B9832A",
        },
        line: "#E4E0D6",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "14px",
      },
    },
  },
  plugins: [],
};

export default config;

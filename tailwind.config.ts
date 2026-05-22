import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f3f5fb",
          100: "#e3e8f4",
          200: "#c2cce5",
          300: "#94a4cf",
          400: "#6477b4",
          500: "#42569a",
          600: "#33437f",
          700: "#293567",
          800: "#1a2249",
          900: "#0B1B3B",
          950: "#060f24"
        },
        gold: {
          50: "#fdf9ed",
          100: "#faf0cc",
          200: "#f4df95",
          300: "#edc85e",
          400: "#e2b13a",
          500: "#C9A227",
          600: "#a87d1e",
          700: "#85601c",
          800: "#6e4d20",
          900: "#5d4022"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Playfair Display'", "Georgia", "serif"]
      },
      boxShadow: {
        soft: "0 4px 24px -8px rgba(11, 27, 59, 0.12)",
        card: "0 1px 2px rgba(11, 27, 59, 0.05), 0 4px 16px -4px rgba(11, 27, 59, 0.08)"
      },
      backgroundImage: {
        "navy-gradient": "linear-gradient(135deg, #0B1B3B 0%, #1a2249 50%, #060f24 100%)",
        "gold-shine": "linear-gradient(135deg, #e2b13a 0%, #C9A227 50%, #a87d1e 100%)"
      }
    }
  },
  plugins: []
};
export default config;

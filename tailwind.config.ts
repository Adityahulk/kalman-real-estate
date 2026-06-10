import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#E8F0F7",
          100: "#D8E6F2",
          200: "#B9D0E4",
          300: "#8FB2D1",
          400: "#5E88B1",
          500: "#2D5986",
          600: "#274F78",
          700: "#234568",
          800: "#203B58",
          900: "#1D3047",
          950: "#1A1A2E"
        },
        gold: {
          50: "#EEF5F1",
          100: "#DCEAE2",
          200: "#BED8C9",
          300: "#9BC2AA",
          400: "#76A98A",
          500: "#5A8A6E",
          600: "#4C765E",
          700: "#40614F",
          800: "#354F42",
          900: "#2C4137"
        },
        slate: {
          50: "#F6F8FA",
          100: "#EDF1F4",
          200: "#DCE3E9",
          300: "#C4CFD8",
          400: "#94A3B1",
          500: "#6B7A8D",
          600: "#566578",
          700: "#424F60",
          800: "#303B4A",
          900: "#222B38",
          950: "#171E28"
        },
        emerald: {
          50: "#EEF5F1",
          100: "#DCEAE2",
          200: "#BED8C9",
          300: "#9BC2AA",
          400: "#76A98A",
          500: "#5A8A6E",
          600: "#4C765E",
          700: "#40614F",
          800: "#354F42",
          900: "#2C4137",
          950: "#17251E"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Playfair Display'", "Georgia", "serif"]
      },
      boxShadow: {
        soft: "0 4px 24px -8px rgba(45, 89, 134, 0.14)",
        card: "0 1px 2px rgba(26, 26, 46, 0.05), 0 4px 16px -4px rgba(45, 89, 134, 0.10)"
      },
      backgroundImage: {
        "navy-gradient": "linear-gradient(135deg, #2D5986 0%, #274F78 50%, #203B58 100%)",
        "gold-shine": "linear-gradient(135deg, #76A98A 0%, #5A8A6E 50%, #4C765E 100%)"
      }
    }
  },
  plugins: []
};
export default config;

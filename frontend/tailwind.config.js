/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Times New Roman"', 'Times', 'serif'],
        serif: ['"Times New Roman"', 'Times', 'serif'],
        mono: ['"Times New Roman"', 'Times', 'serif'],
      },
      colors: {
        background: "#FFFFFF",
        surface: "#FFF7ED",
        border: "#FED7AA",
        primary: {
          DEFAULT: "#F97316",
          hover: "#EA580C",
          dark: "#C2410C",
        },
        body: "#1F2937",
        muted: "#6B7280",
        orangeScale: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
          800: "#9A3412",
          900: "#7C2D12",
        }
      },
      borderRadius: {
        card: "8px",
      }
    },
  },
  plugins: [],
};

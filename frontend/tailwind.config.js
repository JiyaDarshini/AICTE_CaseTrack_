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
      fontSize: {
        'page-title': ['28px', { lineHeight: '1.5', fontWeight: '700' }],
        'section-title': ['18px', { lineHeight: '1.5', fontWeight: '700' }],
        'body': ['15px', { lineHeight: '1.5' }],
        'table': ['14px', { lineHeight: '1.5' }],
        'caption': ['13px', { lineHeight: '1.5' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        'page': '32px',
        'section': '32px',
        'card': '20px',
        'card-gap': '16px',
      },
      colors: {
        background: "#FFFFFF",
        surface: "#FFFFFF",
        zebra: "#FFF7ED",
        border: "#FED7AA",
        primary: {
          DEFAULT: "#F97316",
          hover: "#EA580C",
          dark: "#C2410C",
        },
        body: "#1F2937",
        muted: "#6B7280",
        chip: {
          bg: "#FFFFFF",
          border: "#D1D5DB",
          text: "#1F2937",
        },
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
        DEFAULT: "8px",
        sm: "8px",
        md: "8px",
        lg: "8px",
        card: "8px",
      },
      boxShadow: {
        none: "none",
      }
    },
  },
  plugins: [],
};

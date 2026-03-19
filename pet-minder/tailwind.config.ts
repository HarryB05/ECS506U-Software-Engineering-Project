import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        teal: {
          50: "var(--teal-50)",
          100: "var(--teal-100)",
          300: "var(--teal-300)",
          500: "var(--teal-500)",
          700: "var(--teal-700)",
          900: "var(--teal-900)",
        },
        amber: {
          100: "var(--amber-100)",
          300: "var(--amber-300)",
          500: "var(--amber-500)",
        },
        success: {
          100: "var(--success-100)",
          500: "var(--success-500)",
        },
        danger: {
          100: "var(--danger-100)",
          500: "var(--danger-500)",
        },
        warning: {
          100: "var(--warning-100)",
          500: "var(--warning-500)",
        },
        info: {
          100: "var(--info-100)",
          500: "var(--info-500)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        display: ["var(--font-display)", ...fontFamily.serif],
      },
      fontSize: {
        xs: ["0.6875rem", { lineHeight: "1.3", letterSpacing: "0.05em" }],
        sm: ["0.75rem", { lineHeight: "1.4" }],
        base: ["0.875rem", { lineHeight: "1.5" }],
        lg: ["1rem", { lineHeight: "1.5" }],
        xl: ["1.125rem", { lineHeight: "1.4" }],
        "2xl": ["1.375rem", { lineHeight: "1.3" }],
        "3xl": ["1.75rem", { lineHeight: "1.25" }],
        "4xl": ["2.25rem", { lineHeight: "1.2" }],
      },
      borderRadius: {
        sm: "6px",
        md: "var(--radius)",
        lg: "calc(var(--radius) + 4px)",
        xl: "calc(var(--radius) + 10px)",
        full: "9999px",
      },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
        "card-hover":
          "0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(26,122,102,0.2)",
      },
      maxWidth: {
        content: "1200px",
        narrow: "480px",
        medium: "720px",
      },
      keyframes: {
        "live-pulse": {
          "0%,100%": { transform: "scale(1)", opacity: "0.6" },
          "50%": { transform: "scale(1.5)", opacity: "0" },
        },
        "card-glow": {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(232,147,58,0)" },
          "50%": { boxShadow: "0 0 0 4px rgba(232,147,58,0.3)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "live-pulse": "live-pulse 1.5s ease-in-out infinite",
        "card-glow": "card-glow 2s ease-in-out infinite",
        shimmer: "shimmer 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;

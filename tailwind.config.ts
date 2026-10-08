import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1280px" },
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
        positive: "hsl(var(--positive))",
        // Brand palette (PRD §1.5)
        brand: {
          green: "#0B7A3B",
          gold: "#F4B400",
        },
        // Crowd level scale 1–5 (empty → at capacity)
        crowd: {
          1: "hsl(var(--crowd-1))",
          2: "hsl(var(--crowd-2))",
          3: "hsl(var(--crowd-3))",
          4: "hsl(var(--crowd-4))",
          5: "hsl(var(--crowd-5))",
        },
      },
      fontSize: {
        // Type scale (docs/ux-audit.md G2). Nothing in the product goes below `caption` (12px).
        caption: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        footnote: ["0.8125rem", { lineHeight: "1.125rem" }],
        callout: ["1.0625rem", { lineHeight: "1.5rem" }],
        title: ["1.375rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        display: ["2rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
        "display-lg": ["2.5rem", { lineHeight: "2.75rem", letterSpacing: "-0.025em" }],
      },
      transitionTimingFunction: {
        spring: "var(--ease-spring)",
        "spring-soft": "var(--ease-spring-soft)",
        out: "var(--ease-out)",
        in: "var(--ease-in)",
      },
      transitionDuration: {
        press: "120ms",
        micro: "180ms",
        move: "340ms",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "live-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        "live-ring": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        "digit-in": {
          from: { opacity: "0", transform: "translate3d(0, 40%, 0)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "live-pulse": "live-pulse 1.6s ease-in-out infinite",
        "live-ring": "live-ring 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite",
        "digit-in": "digit-in 200ms var(--ease-out) both",
      },
    },
  },
  plugins: [],
};

export default config;

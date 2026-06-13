import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0066FF",
          dark: "#0052CC",
        },
        surface: {
          page: "#0F1117",
          card: "#161B22",
          sidebar: "#010409",
          hover: "#21262D",
        },
        accent: {
          success: "#238636",
          "success-dark": "#1a5e34",
          error: "#DA3633",
          "error-dark": "#b91c1c",
          warning: "#9E6A03",
          info: "#0969DA",
        },
        neutral: {
          text: "#C9D1D9",
          muted: "#8B949E",
          border: "#30363D",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        h1: ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["24px", { lineHeight: "1.2", fontWeight: "700" }],
        h3: ["18px", { lineHeight: "1.2", fontWeight: "600" }],
        body: ["14px", { lineHeight: "1.6", fontWeight: "400" }],
        small: ["12px", { lineHeight: "1.4", fontWeight: "400" }],
      },
      borderRadius: {
        card: "12px",
        input: "8px",
        button: "8px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
        "card-hover": "0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)",
        glow: "0 0 20px rgba(0, 102, 255, 0.15)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "slide-up": "slideUp 0.4s ease-out forwards",
        spin: "spin 0.8s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #0066FF 0%, #0052CC 100%)",
        "gradient-success": "linear-gradient(135deg, #238636 0%, #1a5e34 100%)",
        "gradient-danger": "linear-gradient(135deg, #DA3633 0%, #b91c1c 100%)",
        "gradient-page": "radial-gradient(ellipse at top, #161B22 0%, #0F1117 50%, #010409 100%)",
      },
    },
  },
  plugins: [],
};

export default config;

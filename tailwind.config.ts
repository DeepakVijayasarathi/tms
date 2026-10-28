import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sampled from logo-icon.png: orange gradient #fe9603 -> #ff6203, charcoal figure #232a33.
        // 700+ are darkened so orange text on white stays readable (WCAG AA).
        brand: {
          50: "#fff6eb", 100: "#ffe8cc", 200: "#ffd099", 300: "#ffb35c", 400: "#fe9603",
          500: "#ff7a03", 600: "#ff6203", 700: "#c24400", 800: "#9a3a06", 900: "#7c2d0a",
        },
        // Sidebar navy from the Meet to Manage portals (hsl 231 46% 14%).
        navy: { DEFAULT: "#141a3a", 800: "#1c2350", 700: "#283066", 900: "#0d1024" },
        ink: { DEFAULT: "#232a33", soft: "#414b57", mute: "#6b7480" },
      },
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "DM Sans", "ui-sans-serif", "sans-serif"],
        rounded: ["Fredoka", "ui-rounded", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        pop: "0 12px 32px -8px rgb(15 23 42 / 0.22)",
        card: "0 1px 2px rgb(16 24 40 / 0.04), 0 1px 1px rgb(16 24 40 / 0.02)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        float: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        "live-ping": { "75%, 100%": { transform: "scale(2.2)", opacity: "0" } },
      },
      animation: {
        "fade-in": "fade-in .3s ease-out",
        "slide-up": "slide-up .4s ease-out backwards",
        float: "float 6s ease-in-out infinite",
        "live-ping": "live-ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;

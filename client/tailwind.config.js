module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        parchment: {
          DEFAULT: "#f5f0e8",
          light: "#faf7f2",
          dark: "#ede8df",
          darker: "#e4ddd0",
        },
        ink: {
          DEFAULT: "#2c2416",
          light: "#5c4f3a",
          muted: "#8c7d65",
          deep: "#1a1208",
        },
        walnut: {
          DEFAULT: "#7a4f2d",
          light: "#9b6440",
          pale: "#b8845a",
        },
        sepia: {
          border: "#d4c9b5",
          strong: "#c4b8a0",
        },
        wax: "#c9a84c",
        quill: "#9b3030",
        moss: "#3d6b45",
      },
      fontFamily: {
        playfair: ["var(--font-playfair)", "Georgia", "serif"],
        lora: ["var(--font-lora)", "Georgia", "serif"],
        garamond: ["var(--font-garamond)", "Georgia", "serif"],
      },
      borderRadius: {
        literary: "3px",
      },
      boxShadow: {
        literary: "0 2px 8px rgba(44, 36, 22, 0.06)",
        "literary-md": "0 4px 16px rgba(44, 36, 22, 0.10)",
        "literary-lg": "0 8px 32px rgba(44, 36, 22, 0.14)",
      },
    },
  },
  plugins: [],
};

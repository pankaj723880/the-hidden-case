import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";

export default defineConfig([
  js.configs.recommended,
  globalIgnores(["dist/**", "node_modules/**"]),
  {
    files: ["**/*.{js,jsx,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        CustomEvent: "readonly",
        document: "readonly",
        DOMParser: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        console: "readonly",
        FormData: "readonly",
        __dirname: "readonly",
        IntersectionObserver: "readonly",
        setTimeout: "readonly",
        PopStateEvent: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
]);

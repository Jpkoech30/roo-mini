import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([
  {
    files: ["src/**/*.mjs", "tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "semi": ["error", "always"],
      "quotes": ["warn", "double", { avoidEscape: true }],
    },
  },
]);

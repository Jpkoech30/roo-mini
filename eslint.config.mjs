/**
 * ESLint configuration — flat config format.
 * Targets Node 18+ ES module code.
 */
export default [
  {
    ignores: ["node_modules/**", ".roo-memory/**", "tests/.test-tmp/**"],
  },
  {
    files: ["src/**/*.mjs", "tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        Buffer: "readonly",
        fetch: "readonly",
      },
    },
    rules: {
      // Possible errors
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-constant-condition": "warn",
      "no-duplicate-imports": "error",

      // Best practices
      "eqeqeq": ["error", "always"],
      "no-eval": "error",
      "no-throw-literal": "error",
      "prefer-const": "warn",
      "no-var": "error",

      // Style (minimal — let prettier handle formatting)
      "semi": ["warn", "always"],
      "curly": ["warn", "all"],
    },
  },
];

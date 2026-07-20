/**
 * ESLint flat config — TypeScript recommended + no-explicit-any.
 * Import-cycle graph lint is not enabled yet (needs eslint-plugin-import +
 * resolver setup for Yarn PnP); tsc path + code review cover cycles for now.
 */
import eslint from "@eslint/js";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".yarn/**",
      ".claude/**",
      "public/**",
      "coverage/**",
      "*.min.js",
      "scripts/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      unicorn,
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    rules: {
      // Audit: surface bare `any` instead of relying on eyeballs.
      "@typescript-eslint/no-explicit-any": "error",
      // Prefer unused checks from tsc (noUnusedLocals); keep eslint quiet on `_`.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Empty catch blocks are intentional in teardown paths.
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Prefer ternary expressions for simple assign/return branches.
      "unicorn/prefer-ternary": "error",
    },
  },
  // Tests may use loose fixtures without full PIXI types.
  {
    files: ["**/*.{test,spec}.ts", "**/__tests__/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
);

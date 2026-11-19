import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import perfectionist from "eslint-plugin-perfectionist";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const perfectionistRules = perfectionist.configs["recommended-natural"].rules;

export default defineConfig(
  globalIgnores(["dist/", "node_modules/", "coverage/"]),

  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,

  perfectionist.configs["recommended-natural"],

  {
    rules: Object.fromEntries(
      Object.keys(perfectionistRules).map((rule) => [rule, "warn"]),
    ),
  },

  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  {
    extends: [tseslint.configs.disableTypeChecked],
    files: ["**/*.{js,mjs,cjs}"],
  },

  prettier,
);
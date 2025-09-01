import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import airbnbBase from "eslint-config-airbnb-base";
import importPlugin from "eslint-plugin-import";

export default defineConfig([
  js,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
    },
    extends: [
      "airbnb-base",
      "plugin:import/recommended",
    ],
    rules: {
      "no-underscore-dangle": "on",
      "max-len": [
        "warn",
        200
      ],
      "no-console": "warn",
      "import/no-extraneous-dependencies": "off",
    },
  },
]);
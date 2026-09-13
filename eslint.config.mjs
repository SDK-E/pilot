import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import importX from "eslint-plugin-import-x";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    ".next/**",
    ".vercel/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "storage/**",
    // Vendored from the shadcn and AI Elements registries and updated through
    // the registry CLI, not edited by hand. Linted like generated code.
    "src/components/ui/**",
    "src/components/ai-elements/**",
  ]),

  js.configs.recommended,
  ...nextVitals,
  ...nextTs,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  unicorn.configs.recommended,
  sonarjs.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.mjs", "*.js", "*.cjs"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      "import-x/resolver-next": [
        createTypeScriptImportResolver({ project: "./tsconfig.json" }),
      ],
    },
    rules: {
      "import-x/no-cycle": "error",
      "import-x/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],

      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      complexity: ["error", 10],
      "max-depth": ["error", 3],
      "max-params": ["error", 4],
      "max-nested-callbacks": ["error", 3],
      "max-lines-per-function": [
        "error",
        { max: 60, skipBlankLines: true, skipComments: true },
      ],
      "max-lines": [
        "error",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      "no-console": "error",

      // Both rules fight framework vocabulary (props, ref, env, req, res) and
      // contradict each other on the same identifiers; the rest of the unicorn
      // readability set stays on.
      "unicorn/prevent-abbreviations": "off",
      "unicorn/name-replacements": "off",
      // Counts fluent builder chains such as zod's `z.string().trim().min(1)`,
      // which have no more readable form. Real nesting is bounded by
      // `max-depth`, `complexity`, and `sonarjs/cognitive-complexity`.
      "unicorn/max-nested-calls": "off",
      // React and DOM APIs use null as a first-class value.
      "unicorn/no-null": "off",
      // `void promise` is the documented way to mark an intentional
      // fire-and-forget for @typescript-eslint/no-floating-promises;
      // no-meaningless-void-operator still catches pointless uses.
      "sonarjs/void-use": "off",
    },
  },

  {
    files: ["src/app/**"],
    rules: {
      // Next.js dynamic segments such as [conversationId] name the params key
      // and follow Next's camelCase convention; Next enforces its own file
      // names (page, layout, route) in this tree.
      "unicorn/filename-case": [
        "error",
        { case: "kebabCase", ignore: [/^\[[^\]]+\]$/u] },
      ],
    },
  },

  {
    files: ["**/*.test.ts", "**/*.test.tsx", "tests/**", "server-tests/**"],
    rules: {
      "max-lines-per-function": "off",
      "max-lines": "off",
      "no-console": "off",
      // Fixtures deliberately hold private and link-local addresses to prove
      // network boundaries reject them.
      "sonarjs/no-hardcoded-ip": "off",
    },
  },

  prettier,
]);

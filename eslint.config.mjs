// @ts-check

/** @import { TSESTree } from "@typescript-eslint/utils" */

import path from "path"
import { fileURLToPath } from "url"
import eslint from "@eslint/js"
import { defineConfig } from "eslint/config"
import tseslint from "typescript-eslint"
import prettierConfig from "eslint-config-prettier"
import { FlatCompat } from "@eslint/eslintrc"
import globals from "globals"

// https://github.com/import-js/eslint-plugin-import/issues/2556
// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const tohuhonoCustomConfig = defineConfig({
  plugins: {
    tohuhono: {
      rules: {
        "no-type-assertion-except-object-keys": {
          meta: {
            type: "suggestion",
            schema: [],
            messages: {
              avoidTypeAssertion:
                "Avoid type assertions. Prefer structural typing, runtime checks, or fixing source types.",
            },
          },
          create(context) {
            /** @param {TSESTree.TSAsExpression | TSESTree.TSTypeAssertion} node */
            const reportIfInvalid = (node) => {
              const isObjectKeysCall =
                node.expression?.type === "CallExpression" &&
                node.expression.callee?.type === "MemberExpression" &&
                !node.expression.callee.computed &&
                node.expression.callee.object?.type === "Identifier" &&
                node.expression.callee.object.name === "Object" &&
                node.expression.callee.property?.type === "Identifier" &&
                node.expression.callee.property.name === "keys"

              const isConstAssertion =
                node.typeAnnotation?.type === "TSTypeReference" &&
                node.typeAnnotation.typeName?.type === "Identifier" &&
                node.typeAnnotation.typeName.name === "const"

              if (!isObjectKeysCall && !isConstAssertion) {
                context.report({
                  node,
                  messageId: "avoidTypeAssertion",
                })
              }
            }

            return {
              TSAsExpression: reportIfInvalid,
              TSTypeAssertion: reportIfInvalid,
            }
          },
        },
      },
    },
  },
  rules: {
    "@typescript-eslint/consistent-type-assertions": "off",
    "tohuhono/no-type-assertion-except-object-keys": ["error"],
  },
})

export default defineConfig(
  {
    ignores: [
      ".next/**/*",
      ".vercel/**/*",
      ".playwright/**/*",
      "node_modules/**/*",
      "dist/**/*",
      ".rollup.cache/**/*",
      ".playwright/e2e-runtime/**",
    ],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...compat.plugins("import"),
  prettierConfig,
  tohuhonoCustomConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // ensure consistant imports
      "import/order": [
        "error",
        {
          pathGroups: [
            {
              pattern: "dotenv",
              group: "builtin",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["dotenv"],
        },
      ], //"dotenv"
      // conflicts with the the smarter tsc version
      "@typescript-eslint/no-unused-vars": "off",
      // Use this to provide a consistant interface name
      "@typescript-eslint/no-empty-object-type": "off",
      // Allow directives
      "@typescript-eslint/no-unused-expressions": "off",
      "no-unused-expressions": ["error", { ignoreDirectives: true }],
      // prevent enums
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message: "Don't declare enums",
        },
      ],
      curly: "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "tohuhono/no-type-assertion-except-object-keys": "off",
    },
  },
)

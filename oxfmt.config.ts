import { defineConfig } from "oxfmt"

export default defineConfig({
  semi: false,
  trailingComma: "all",
  proseWrap: "always",
  ignorePatterns: ["src/routeTree.gen.ts", ".output", ".tanstack"],
  sortTailwindcss: {
    functions: ["clsx", "cx", "cva", "cn"],
  },
  sortImports: true,
})

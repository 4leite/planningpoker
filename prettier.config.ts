import { type Config } from "prettier"

export default {
  trailingComma: "all",
  semi: false,
  proseWrap: "always",
  tailwindFunctions: ["clsx", "cx", "cva", "cn"],
  plugins: ["prettier-plugin-tailwindcss"],
} satisfies Config

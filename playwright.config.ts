import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./test/e2e",
  outputDir: "./test/results",
  timeout: 120_000,
  globalSetup: "./test/e2e/global-setup.ts",
  globalTeardown: "./test/e2e/global-teardown.ts",
  use: {
    baseURL: "http://127.0.0.1:3000",
  },
})

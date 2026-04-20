import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./test/e2e",
  outputDir: "./test/results",
  timeout: 120_000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm docker:up",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 900_000,
    stdout: "pipe",
    stderr: "pipe",
  },
})

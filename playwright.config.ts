import { defineConfig } from "@playwright/test"

const remoteBaseUrl = process.env.PLAYWRIGHT_BASE_URL
const baseURL = remoteBaseUrl ?? "http://127.0.0.1:3000"
const accessClientId = process.env.CLOUDFLARE_ACCESS_CLIENT_ID
const accessClientSecret = process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET
const extraHTTPHeaders =
  accessClientId && accessClientSecret
    ? {
        "CF-Access-Client-Id": accessClientId,
        "CF-Access-Client-Secret": accessClientSecret,
      }
    : undefined

export default defineConfig({
  testDir: "./test/e2e",
  outputDir: "./test/results",
  timeout: 30_000,
  retries: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "test/playwright-report" }]],
  use: {
    baseURL,
    extraHTTPHeaders,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "smoke-setup",
      grep: /@setup/,
    },
    {
      name: "main",
      grepInvert: /@setup/,
      dependencies: ["smoke-setup"],
    },
  ],
  webServer: remoteBaseUrl
    ? undefined
    : {
        command: "pnpm preview:e2e",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 60_000,
        stdout: "pipe",
        stderr: "pipe",
      },
})

import { expect, test as setup } from "@playwright/test"

setup("deployed target serves the app shell @setup", async ({ request }) => {
  await expect
    .poll(
      async () => {
        const response = await request.get("/", {
          failOnStatusCode: false,
          timeout: 15_000,
        })

        const body = await response.text()
        const responseUrl = response.url()

        if (responseUrl.includes("/cdn-cgi/access/login/")) {
          return `access-login:${response.status()}`
        }

        if (!response.ok()) {
          return `status:${response.status()}`
        }

        if (!body.includes("Create New Table")) {
          return "missing-app-shell"
        }

        return "ready"
      },
      {
        intervals: [1_000, 2_000, 5_000],
        message:
          "Expected the deployed smoke target to serve the app shell instead of the Cloudflare Access login page.",
        timeout: 900_000,
      },
    )
    .toBe("ready")
})

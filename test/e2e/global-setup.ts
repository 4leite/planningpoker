import { execSync } from "node:child_process"

import type { FullConfig } from "@playwright/test"

const baseUrl = "http://127.0.0.1:3000"
const imageName = "localhost/planningpoker-e2e:latest"
const containerName = "planning-poker-e2e"

const waitForApp = async () => {
  const timeoutAt = Date.now() + 120_000

  while (Date.now() < timeoutAt) {
    try {
      const response = await fetch(baseUrl)

      if (response.ok) {
        return
      }
    } catch {
      // Keep polling until the app is reachable.
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }

  throw new Error(`Timed out waiting for ${baseUrl}`)
}

async function globalSetup(_config: FullConfig) {
  execSync(`podman build --storage-opt ignore_chown_errors=true -t ${imageName} -f Dockerfile .`, {
    cwd: process.cwd(),
    stdio: "inherit",
  })

  execSync(
    [
      "podman run --replace -d",
      `--name ${containerName}`,
      "--userns keep-id",
      "-p 3000:3000",
      "--mount type=tmpfs,destination=/data",
      imageName,
    ].join(" "),
    {
      cwd: process.cwd(),
      stdio: "inherit",
    },
  )

  execSync(`podman ps --filter name=${containerName}`, {
    cwd: process.cwd(),
    stdio: "inherit",
  })

  await waitForApp()
}

export default globalSetup

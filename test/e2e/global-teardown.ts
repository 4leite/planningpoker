import { execSync } from "node:child_process"

import type { FullConfig } from "@playwright/test"

async function globalTeardown(_config: FullConfig) {
  execSync("podman rm -f planning-poker-e2e", {
    cwd: process.cwd(),
    stdio: "inherit",
  })
}

export default globalTeardown

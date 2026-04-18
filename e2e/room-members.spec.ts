import { test as base, expect, type BrowserContext, type Page } from "@playwright/test"

type MemberSession = {
  context: BrowserContext
  page: Page
}

type Fixtures = {
  createMember: (roomUrl: string, name: string) => Promise<MemberSession>
}

const test = base.extend<Fixtures>({
  createMember: async ({ browser }, use) => {
    const sessions: MemberSession[] = []

    await use(async (roomUrl, name) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      await page.goto(roomUrl)
      await page.getByPlaceholder("name").fill(name)
      await page.getByRole("button", { name: "join", exact: true }).click()
      await expect(page.getByText(name, { exact: true })).toBeVisible()
      const session = { context, page }
      sessions.push(session)
      return session
    })

    for (const { context } of sessions) {
      await context.close()
    }
  },
})

const MEMBER_NAMES = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Hank"] as const

test("8 members can join the same room and see each other", async ({
  browser,
  createMember,
}, testInfo) => {
  const creatorContext = await browser.newContext()
  const creatorPage = await creatorContext.newPage()

  const roomUrl = await test.step("create room", async () => {
    await creatorPage.goto("/")
    await creatorPage.getByRole("button", { name: "create", exact: true }).click()
    await expect(creatorPage).toHaveURL(/\/rooms\//)
    const url = creatorPage.url()
    testInfo.annotations.push({ type: "room-url", description: url })
    console.log(`\n🃏  Room URL: ${url}\n`)
    return url
  })

  await test.step("creator joins", async () => {
    await creatorPage.getByPlaceholder("name").fill(MEMBER_NAMES[0])
    await creatorPage.getByRole("button", { name: "join", exact: true }).click()
    await expect(creatorPage.getByText(MEMBER_NAMES[0], { exact: true })).toBeVisible()
  })

  // Join sequentially to stay within HTTP/1.1's 6-connection-per-origin limit
  // (each member holds one persistent SSE connection)
  await test.step("7 more members join", async () => {
    for (const name of MEMBER_NAMES.slice(1)) {
      await createMember(roomUrl, name)
    }
  })

  await test.step("all 8 members visible to creator", async () => {
    for (const name of MEMBER_NAMES) {
      await expect(creatorPage.getByText(name, { exact: true })).toBeVisible()
    }
  })

  await creatorContext.close()
})

test("reloading the room keeps the same member joined", async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto("/")
  await page.getByRole("button", { name: "create", exact: true }).click()
  await expect(page).toHaveURL(/\/rooms\//)

  await page.getByPlaceholder("name").fill("Alice")
  await page.getByRole("button", { name: "join", exact: true }).click()
  await expect(page.getByText("Alice", { exact: true })).toBeVisible()

  await page.reload()

  await expect(page.getByText("Alice", { exact: true })).toBeVisible()
  await expect(page.getByPlaceholder("name")).toHaveCount(0)

  await context.close()
})

test("creating a new room reuses the saved display name", async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto("/")
  await page.getByRole("button", { name: "create", exact: true }).click()
  await expect(page).toHaveURL(/\/rooms\//)

  await page.getByPlaceholder("name").fill("Alice")
  await page.getByRole("button", { name: "join", exact: true }).click()
  await expect(page.getByText("Alice", { exact: true })).toBeVisible()

  await page.goto("/")
  await page.getByRole("button", { name: "create", exact: true }).click()
  await expect(page).toHaveURL(/\/rooms\//)

  await expect(page.getByPlaceholder("name")).toHaveValue("Alice")
  await page.getByRole("button", { name: "join", exact: true }).click()
  await expect(page.getByText("Alice", { exact: true })).toBeVisible()

  await context.close()
})

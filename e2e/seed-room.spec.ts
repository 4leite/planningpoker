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

const namePool = [
  "Alice",
  "Bob",
  "Carol",
  "Dave",
  "Eve",
  "Frank",
  "Grace",
  "Hank",
  "Ivy",
  "Jules",
  "Kai",
  "Lena",
  "Maya",
  "Nico",
  "Owen",
  "Pia",
  "Quinn",
  "Rae",
  "Sage",
  "Tess",
  "Uma",
  "Vera",
  "Wes",
  "Xena",
  "Yara",
  "Zane",
] as const

const getMemberNames = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const baseName = namePool[index % namePool.length]
    const cycle = Math.floor(index / namePool.length)

    return cycle === 0 ? baseName : `${baseName} ${cycle + 1}`
  })

test("seed room for manual join", async ({ browser, createMember }, testInfo) => {
  test.setTimeout(0)

  const requestedCount = Number.parseInt(process.env.SEED_ROOM_MEMBER_COUNT ?? "12", 10)
  const memberCount = Number.isFinite(requestedCount) && requestedCount > 0 ? requestedCount : 12
  const memberNames = getMemberNames(memberCount)
  const creatorContext = await browser.newContext()
  const creatorPage = await creatorContext.newPage()

  const roomUrl = await test.step("create room", async () => {
    await creatorPage.goto("/")
    await creatorPage.getByRole("button", { name: "create", exact: true }).click()
    await expect(creatorPage).toHaveURL(/\/rooms\//)
    const url = creatorPage.url()
    testInfo.annotations.push({ type: "room-url", description: url })
    console.log(`\nRoom ready for manual join: ${url}\n`)
    return url
  })

  await test.step("seed participants", async () => {
    await creatorPage.getByPlaceholder("name").fill(memberNames[0] ?? "Alice")
    await creatorPage.getByRole("button", { name: "join", exact: true }).click()
    await expect(creatorPage.getByText(memberNames[0] ?? "Alice", { exact: true })).toBeVisible()

    for (const name of memberNames.slice(1)) {
      await createMember(roomUrl, name)
    }
  })

  await test.step("verify participants visible", async () => {
    for (const name of memberNames) {
      await expect(creatorPage.getByText(name, { exact: true })).toBeVisible()
    }
  })

  await creatorPage.pause()
  await creatorContext.close()
})
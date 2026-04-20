import { type BrowserContext, type Page } from "@playwright/test"

import { joinRoom, createRoom } from "../support/member-actions"
import { roomSeat } from "../support/room-selectors"
import { expect, test as base } from "./runtime-hygiene"

export type MemberSession = {
  context: BrowserContext
  page: Page
  name: string
}

type Fixtures = {
  openMember: (roomUrl: string, name: string) => Promise<MemberSession>
  createRoomWithCreator: (
    creatorName: string,
  ) => Promise<{ roomUrl: string; creator: MemberSession }>
  expectMemberVisible: (page: Page, name: string) => Promise<void>
}

export const test = base.extend<Fixtures>({
  context: async ({ browser }, use, testInfo) => {
    const context = await browser.newContext({
      userAgent: `planningpoker-e2e/${testInfo.testId}`,
    })

    await use(context)
    await context.close()
  },
  page: async ({ context, runtimeHygiene }, use) => {
    const page = await context.newPage()
    runtimeHygiene.trackPage(page)

    await use(page)
  },
  openMember: async ({ browser, runtimeHygiene }, use, testInfo) => {
    const sessions: MemberSession[] = []
    let sessionIndex = 0

    await use(async (roomUrl, name) => {
      const context = await browser.newContext({
        userAgent: `planningpoker-e2e/${testInfo.testId}/member/${name}/${sessionIndex}`,
      })
      const page = await context.newPage()
      runtimeHygiene.trackPage(page)
      await page.goto(roomUrl)
      await joinRoom(page, name)

      const session = { context, page, name }
      sessions.push(session)
      sessionIndex += 1
      return session
    })

    await runtimeHygiene.ignoreDuring(async () => {
      for (const { context } of sessions) {
        await context.close()
      }
    })
  },
  createRoomWithCreator: async ({ browser, runtimeHygiene }, use, testInfo) => {
    const sessions: MemberSession[] = []
    let sessionIndex = 0

    await use(async (creatorName) => {
      const context = await browser.newContext({
        userAgent: `planningpoker-e2e/${testInfo.testId}/creator/${creatorName}/${sessionIndex}`,
      })
      const page = await context.newPage()
      runtimeHygiene.trackPage(page)
      await createRoom(page)
      await joinRoom(page, creatorName)

      const creator = { context, page, name: creatorName }
      sessions.push(creator)
      sessionIndex += 1

      return {
        roomUrl: page.url(),
        creator,
      }
    })

    await runtimeHygiene.ignoreDuring(async () => {
      for (const { context } of sessions) {
        await context.close()
      }
    })
  },
  expectMemberVisible: async ({}, use) => {
    await use(async (page, name) => {
      await expect(roomSeat(page, name)).toBeVisible()
    })
  },
})

export { expect }

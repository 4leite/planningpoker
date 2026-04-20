import { expect, test } from "./fixtures/room"
import { createRoom, joinRoom } from "./support/member-actions"
import { displayNameInput, roomJoinButton, roomNotFoundMessage } from "./support/room-selectors"

test.describe("Room membership", () => {
  test("two members join the same room and see each other live @smoke @realtime", async ({
    createRoomWithCreator,
    openMember,
    expectMemberVisible,
  }) => {
    const { roomUrl, creator } = await createRoomWithCreator("Alice")
    const bob = await openMember(roomUrl, "Bob")

    await expectMemberVisible(creator.page, "Bob")
    await expectMemberVisible(bob.page, "Alice")
  })

  test("reloading the room keeps the same member joined @smoke", async ({
    page,
    expectMemberVisible,
  }) => {
    await createRoom(page)
    await joinRoom(page, "Alice")

    await page.reload()

    await expectMemberVisible(page, "Alice")
    await expect(displayNameInput(page)).toHaveCount(0)
  })

  test("duplicate display names can recover by choosing a different name @errors", async ({
    browser,
    runtimeHygiene,
    createRoomWithCreator,
    expectMemberVisible,
  }) => {
    const { roomUrl, creator } = await createRoomWithCreator("Alice")
    const context = await browser.newContext()
    const page = await context.newPage()
    runtimeHygiene.trackPage(page)

    try {
      await page.goto(roomUrl)
      await displayNameInput(page).fill("Alice")
      await roomJoinButton(page).click()

      await expect(
        page
          .getByRole("dialog", { name: "Enter display name" })
          .getByText("That display name is already taken in this room.", { exact: true }),
      ).toBeVisible()

      await displayNameInput(page).fill("Bob")
      await roomJoinButton(page).click()

      await expectMemberVisible(page, "Bob")
      await expectMemberVisible(creator.page, "Bob")
    } finally {
      await runtimeHygiene.ignoreDuring(async () => {
        await context.close()
      })
    }
  })

  test("creating a new room reuses the saved display name @smoke", async ({
    page,
    expectMemberVisible,
  }) => {
    await createRoom(page)
    await joinRoom(page, "Alice")

    await page.goto("/")
    await createRoom(page)

    await expect(displayNameInput(page)).toHaveValue("Alice")
    await roomJoinButton(page).click()

    await expectMemberVisible(page, "Alice")
  })

  test("unknown room routes show the not-found state @errors", async ({ page }) => {
    await page.goto("/r/silver-regions-try")

    await expect(roomNotFoundMessage(page)).toBeVisible()
    await expect(page.getByRole("link", { name: "back" })).toBeVisible()
  })
})

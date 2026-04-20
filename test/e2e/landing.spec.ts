import { expect, test } from "./fixtures/room"
import {
  createRoom,
  joinExistingRoomFromLanding,
  joinRoom,
  roomIdFromUrl,
} from "./support/member-actions"
import { displayNameInput, roomIdInput } from "./support/room-selectors"

test.describe("Landing flows", () => {
  test("create room opens the display-name prompt @smoke", async ({ page }) => {
    const roomUrl = await createRoom(page)

    expect(roomIdFromUrl(roomUrl)).toMatch(/-/)
    await expect(displayNameInput(page)).toBeVisible()
  })

  test("join existing room from the landing page @smoke", async ({
    page,
    createRoomWithCreator,
    expectMemberVisible,
  }) => {
    const { roomUrl, creator } = await createRoomWithCreator("Alice")

    await joinExistingRoomFromLanding(page, roomIdFromUrl(roomUrl))
    await joinRoom(page, "Bob")

    await expectMemberVisible(page, "Alice")
    await expectMemberVisible(creator.page, "Bob")
  })

  test("invalid room id on the landing page shows validation feedback @errors", async ({
    page,
  }) => {
    await page.goto("/")
    await roomIdInput(page).fill("bad")
    await page.getByRole("button", { name: "Join", exact: true }).click()

    await expect(
      page.getByText("Use a room id like silver-regions-try.", { exact: true }),
    ).toBeVisible()
  })
})

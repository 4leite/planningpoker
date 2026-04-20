import { expect, test } from "./fixtures/room"
import { createRoom, joinRoom, castVote, revealVotes } from "./support/member-actions"
import { displayNameInput, roomJoinButton, roomResultInput } from "./support/room-selectors"

test.describe("Room errors", () => {
  test("invalid revealed results are rejected without changing room state @errors", async ({
    createRoomWithCreator,
    openMember,
  }) => {
    const { roomUrl, creator } = await createRoomWithCreator("Alice")
    const bob = await openMember(roomUrl, "Bob")

    await castVote(creator.page, "3")
    await castVote(bob.page, "5")
    await revealVotes(creator.page)

    const resultInput = roomResultInput(creator.page)
    await resultInput.click()
    await resultInput.fill("4")
    await resultInput.press("Enter")

    await expect(
      creator.page.getByText("Choose a card from the deck values.", { exact: true }),
    ).toBeVisible()
    await expect(resultInput).toHaveValue("3")
    await expect(roomResultInput(bob.page)).toHaveValue("3")
  })

  test("a removed member can rejoin after leaving from another tab @errors @realtime", async ({
    page,
    runtimeHygiene,
    expectMemberVisible,
  }) => {
    const roomUrl = await createRoom(page)
    await joinRoom(page, "Alice")

    const secondTab = await page.context().newPage()
    runtimeHygiene.trackPage(secondTab)

    try {
      await secondTab.goto(roomUrl)
      await secondTab.getByRole("button", { name: "Exit room" }).click()

      await expect(displayNameInput(page)).toHaveValue("Alice")
      await roomJoinButton(page).click()
      await expectMemberVisible(page, "Alice")
    } finally {
      await runtimeHygiene.ignoreDuring(async () => {
        await secondTab.close()
      })
    }
  })
})
